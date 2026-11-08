import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Keyboard,
  Alert,
  PermissionsAndroid,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import {
  useSendMessage,
  useMarkConversationRead,
} from '../../hooks/useConversations';
import { requestPushNotif } from '../../services/pushNotificationService';
import { uploadChatAttachment } from '../../services/minioService';
import { getCurrentLocationInfo } from '../../services/geocodeService';
import { getAuthState } from '../../store/useAuthStore';
import { ChatAttachmentSheet } from './ChatAttachmentSheet';
import { cn } from '../../utils';

interface Props {
  conversationId: string;
  currentUserId: string;
  disabled?: boolean;
  onAddMember?: () => void;
}

export function ChatInput({
  conversationId,
  currentUserId,
  disabled,
  onAddMember,
}: Props) {
  const insets = useSafeAreaInsets();
  const [text, setText] = React.useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isLocating, setIsLocating] = React.useState(false);

  const sheetRef = React.useRef<BottomSheetModal>(null);
  const sendMutation = useSendMessage(conversationId);
  const markAsRead = useMarkConversationRead();

  React.useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const appBottomPad = Platform.OS === 'android' ? insets.bottom : 0;
  const bottomPad = !isKeyboardVisible ? appBottomPad : 0;

  const trimmed = text.trim();
  const hasText = trimmed.length > 0;
  const isBusy = sendMutation.isPending || isUploading || isLocating;

  const getEffectiveUserId = () => {
    return currentUserId || getAuthState().user?.id || '';
  };

  const handleSend = () => {
    const senderId = getEffectiveUserId();
    if (!trimmed) return;
    if (!senderId) return;
    if (!conversationId) return;

    setText('');
    try {
      sendMutation.mutateAsync({
        senderId,
        content: trimmed,
      });
      requestPushNotif(senderId);
      markAsRead.mutate({ conversationId, userId: senderId });
    } catch {
      setText(trimmed);
    }
  };

  const handleOpenOptions = () => {
    Keyboard.dismiss();
    sheetRef.current?.present();
  };

  const handleUploadAndSend = async (uri: string) => {
    const senderId = getEffectiveUserId();
    if (!senderId || !conversationId) {
      Alert.alert(
        'Error',
        'Unable to send message: user is not authenticated.',
      );
      return;
    }

    setIsUploading(true);
    try {
      const uploadRes = await uploadChatAttachment(
        uri,
        senderId,
        conversationId,
      );
      await sendMutation.mutateAsync({
        senderId,
        content: uploadRes.url,
      });
      requestPushNotif(senderId);
      markAsRead.mutate({ conversationId, userId: senderId });
    } catch (err: any) {
      Alert.alert(
        'Upload Failed',
        err?.message || 'Could not upload and send image.',
      );
    } finally {
      setIsUploading(false);
    }
  };

  const requestAndroidCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );
      if (granted) return true;

      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message:
            'Solar Installation Management System needs camera access so you can take and share photos in conversation.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Failed to request android camera permission:', err);
      return false;
    }
  };

  const handleCamera = async () => {
    try {
      const hasPermission = await requestAndroidCameraPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Camera access is needed to take a photo. Please enable it in Settings.',
        );
        return;
      }

      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
        saveToPhotos: false,
        cameraType: 'back',
        presentationStyle: 'fullScreen',
      });

      if (result.errorCode) {
        if (result.errorCode === 'permission') {
          Alert.alert(
            'Camera Permission Required',
            'Please enable camera access in your device Settings to take photos.',
          );
          return;
        }

        if (result.errorCode === 'camera_unavailable') {
          Alert.alert(
            'Camera Unavailable',
            'The camera is not available on this device or simulator. Would you like to select a photo from your library instead?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Library',
                onPress: () => {
                  setTimeout(() => {
                    handleUploadImage();
                  }, 200);
                },
              },
            ],
          );
          return;
        }

        Alert.alert(
          'Camera Error',
          result.errorMessage || `Could not open camera (${result.errorCode}).`,
        );
        return;
      }

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }

      const uri = result.assets[0].uri;
      if (!uri) return;
      await handleUploadAndSend(uri);
    } catch (err: any) {
      console.warn('handleCamera error:', err);
      Alert.alert('Camera Error', err?.message || 'Could not open camera.');
    }
  };

  const handleUploadImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.8,
      });

      if (result.errorCode === 'permission') {
        Alert.alert(
          'Photo Library Permission Required',
          'Please enable photo library access in your device Settings to select images.',
        );
        return;
      }

      if (result.errorCode) {
        Alert.alert(
          'Image Picker Error',
          result.errorMessage || `Could not pick image (${result.errorCode}).`,
        );
        return;
      }

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }

      const uri = result.assets[0].uri;
      if (!uri) return;
      await handleUploadAndSend(uri);
    } catch (err: any) {
      Alert.alert('Image Error', err?.message || 'Could not pick photo.');
    }
  };

  const handleShareLocation = async () => {
    const senderId = getEffectiveUserId();
    if (!senderId || !conversationId) return;

    setIsLocating(true);
    try {
      const loc = await getCurrentLocationInfo();
      const locationLabel = loc.conciseAddress || loc.address;
      const mapLink = `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`;
      const content = `📍 Location: ${locationLabel}\n${mapLink}`;

      await sendMutation.mutateAsync({
        senderId,
        content,
      });
      requestPushNotif(senderId);
      markAsRead.mutate({ conversationId, userId: senderId });
    } catch (err: any) {
      Alert.alert(
        'Location Error',
        err?.message || 'Could not obtain your current location.',
      );
    } finally {
      setIsLocating(false);
    }
  };

  const handleDocument = () => {
    Alert.alert('Coming Soon', 'Document sharing is coming soon.');
  };

  const handleContact = () => {
    Alert.alert('Coming Soon', 'Contact sharing is coming soon.');
  };

  return (
    <>
      <View
        style={{ paddingBottom: bottomPad + 30 }}
        className={cn(
          `flex-row items-center px-4 pt-4 bg-white border-t border-gray-200`,
        )}
      >
        <View
          className={cn(
            'flex-1 flex-row mb-4 items-end bg-gray-100 ml-2 rounded-3xl mr-2',
            'mb-' + insets.bottom,
          )}
        >
          <TextInput
            className="flex-1 text-base text-gray-800 ml-4 pt-2.5 pb-3.5 rounded-3xl"
            style={{ paddingVertical: 0 }}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            value={text}
            onChangeText={setText}
            multiline
            textAlignVertical="center"
            returnKeyType="default"
            editable={!disabled && !isBusy}
            autoCorrect={false} // Disables iOS/Android auto-correction
            spellCheck={false} // Disables red spell-check underlines (iOS)
            autoComplete="off" // Prevents platform autofill suggestions
            importantForAutofill="no" // Extra protection for Android autofill
          />
        </View>

        <TouchableOpacity
          onPress={hasText ? handleSend : handleOpenOptions}
          disabled={disabled || isBusy}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={hasText ? 'Send message' : 'Attach options'}
          className={`-mt-0.5 w-10 h-10 rounded-full items-center justify-center ${
            disabled ? 'bg-gray-300' : 'bg-emerald-600'
          }`}
        >
          {isBusy ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : hasText ? (
            <MaterialIcons
              name="send"
              size={18}
              color={disabled ? '#9CA3AF' : '#fff'}
            />
          ) : (
            <MaterialIcons
              name="add"
              size={24}
              color={disabled ? '#9CA3AF' : '#fff'}
            />
          )}
        </TouchableOpacity>
      </View>

      <ChatAttachmentSheet
        sheetRef={sheetRef}
        onCamera={handleCamera}
        onUploadImage={handleUploadImage}
        onShareLocation={handleShareLocation}
        onDocument={handleDocument}
        onContact={handleContact}
        onAddMember={onAddMember ?? (() => {})}
      />
    </>
  );
}
