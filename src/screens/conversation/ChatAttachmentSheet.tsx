import React, { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBottomSheetBackdrop } from '../../components';

export interface ChatAttachmentSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onCamera: () => void;
  onUploadImage: () => void;
  onShareLocation: () => void;
  onDocument: () => void;
  onContact?: () => void;
  onAddMember: () => void;
}

interface AttachmentOptionItem {
  key: string;
  icon: string;
  iconColor: string;
  bgColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}

export function ChatAttachmentSheet({
  sheetRef,
  onCamera,
  onUploadImage,
  onShareLocation,
  onDocument,
  onAddMember,
}: // onContact,
ChatAttachmentSheetProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(() => ['62%'], []);

  const renderBackdrop = useCallback(
    (props: any) => <AppBottomSheetBackdrop {...props} />,
    [],
  );

  const handleItemPress = useCallback(
    (action: () => void) => {
      sheetRef.current?.dismiss();
      // Allow the BottomSheetModal dismiss animation to finish before launching
      // native modal activities (like camera or image library) to prevent
      // UIViewController transition conflicts on iOS.
      setTimeout(() => {
        action();
      }, 350);
    },
    [sheetRef],
  );

  const options: AttachmentOptionItem[] = [
    {
      key: 'camera',
      icon: 'photo-camera',
      iconColor: '#0284C7',
      bgColor: '#E0F2FE',
      title: 'Take a photo',
      subtitle: 'Use your camera',
      onPress: onCamera,
    },
    {
      key: 'upload_image',
      icon: 'photo-library',
      iconColor: '#7C3AED',
      bgColor: '#F3E8FF',
      title: 'Upload Image',
      subtitle: 'Choose from your photo library',
      onPress: onUploadImage,
    },
    {
      key: 'add_member',
      icon: 'person-add',
      iconColor: '#4F46E5',
      bgColor: '#EEF2FF',
      title: 'Add Member',
      subtitle: 'Start a group conversation',
      onPress: onAddMember,
    },
    {
      key: 'share_location',
      icon: 'location-on',
      iconColor: '#059669',
      bgColor: '#D1FAE5',
      title: 'Share Location',
      subtitle: 'Send your current location',
      onPress: onShareLocation,
    },
    {
      key: 'document',
      icon: 'insert-drive-file',
      iconColor: '#D97706',
      bgColor: '#FEF3C7',
      title: 'Document',
      subtitle: 'Share a document or file',
      onPress: onDocument,
    },
    // {
    //   key: 'contact',
    //   icon: 'person',
    //   iconColor: '#2563EB',
    //   bgColor: '#DBEAFE',
    //   title: 'Contact',
    //   subtitle: 'Share contact information',
    //   onPress: onContact,
    // },
  ];

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      handleIndicatorStyle={{ backgroundColor: '#D1D5DB', width: 40 }}
    >
      <BottomSheetView
        style={{
          paddingBottom:
            Platform.OS === 'android'
              ? Math.max(insets.bottom, 20)
              : Math.max(insets.bottom, 16),
        }}
      >
        {/* Header */}
        <View className="px-5 pt-2 pb-3 border-b border-gray-100 flex-row items-center justify-between">
          <Text className="text-lg font-bold text-gray-900">Share Content</Text>
          <TouchableOpacity
            onPress={() => sheetRef.current?.dismiss()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <MaterialIcons name="close" size={22} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Options list */}
        <View className="py-1">
          {options.map(item => (
            <TouchableOpacity
              key={item.key}
              onPress={() => handleItemPress(item.onPress)}
              activeOpacity={0.7}
              className="flex-row items-center px-5 py-3 border-b border-gray-50 active:bg-gray-50"
              accessibilityRole="button"
              accessibilityLabel={item.title}
            >
              <View
                style={{ backgroundColor: item.bgColor }}
                className="w-11 h-11 rounded-full items-center justify-center mr-4"
              >
                <MaterialIcons
                  name={item.icon}
                  size={22}
                  color={item.iconColor}
                />
              </View>

              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-800">
                  {item.title}
                </Text>
                <Text className="text-xs text-gray-400 mt-0.5">
                  {item.subtitle}
                </Text>
              </View>

              <MaterialIcons name="chevron-right" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
