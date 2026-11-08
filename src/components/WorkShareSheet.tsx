/**
 * WorkShareSheet
 * Bottom sheet with share options for a work listing.
 *
 * Options:
 *  • Copy Link        — copies the deep-link URL to clipboard
 *  • Native Share     — opens the OS share sheet (any app)
 *  • Share on Facebook — opens fb.me with the work URL pre-filled
 *  • Share on WhatsApp — opens wa.me with a pre-composed message (WhatsApp is #1 in PH)
 *  • Share via Viber  — opens viber:// deep link (popular in PH)
 *  • Share via SMS    — opens the SMS composer pre-filled
 *  • Share via Email  — opens the mail composer pre-filled
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Share,
  Linking,
  Clipboard,
  Platform,
  ToastAndroid,
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBottomSheetBackdrop } from './AppBottomSheetBackdrop';
import { Work } from '../types';

// ─── Deep-link URL builder ────────────────────────────────────

function buildWorkUrl(workId: string): string {
  return `https://solarimsys.online/works/${workId}`;
}

function buildShareMessage(work: Work, url: string): string {
  const title = work.title || work.description.slice(0, 60);
  const location = work.conciseLocation || work.location;
  return [
    `📋 ${title}`,
    location ? `📍 ${location}` : null,
    `\n${url}`,
    '\n— shared via Solar Installation Management System',
  ]
    .filter(Boolean)
    .join('\n');
}

// ─── Share option definition ──────────────────────────────────

interface ShareOption {
  id: string;
  label: string;
  description: string;
  icon: string;
  iconColor: string;
  bgColor: string;
}

const SHARE_OPTIONS: ShareOption[] = [
  {
    id: 'copy',
    label: 'Copy Link',
    description: 'Copy the work link to clipboard',
    icon: 'link',
    iconColor: '#374151',
    bgColor: '#F3F4F6',
  },
  {
    id: 'native',
    label: 'Share…',
    description: 'Open system share sheet',
    icon: Platform.OS === 'ios' ? 'ios-share' : 'share',
    iconColor: '#374151',
    bgColor: '#F3F4F6',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    description: 'Send via WhatsApp',
    icon: 'chat',
    iconColor: '#FFFFFF',
    bgColor: '#25D366',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    description: 'Share on Facebook',
    icon: 'public',
    iconColor: '#FFFFFF',
    bgColor: '#1877F2',
  },
  {
    id: 'viber',
    label: 'Viber',
    description: 'Share via Viber',
    icon: 'message',
    iconColor: '#FFFFFF',
    bgColor: '#7360F2',
  },
  {
    id: 'sms',
    label: 'SMS',
    description: 'Send as text message',
    icon: 'sms',
    iconColor: '#FFFFFF',
    bgColor: '#10B981',
  },
  {
    id: 'email',
    label: 'Email',
    description: 'Share via email',
    icon: 'email',
    iconColor: '#FFFFFF',
    bgColor: '#EF4444',
  },
];

// ─── Props ────────────────────────────────────────────────────

interface WorkShareSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  work: Work;
}

// ─── Component ───────────────────────────────────────────────

export function WorkShareSheet({
  sheetRef,
  work,
}: WorkShareSheetProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(() => ['60%'], []);
  const [copied, setCopied] = useState(false);

  const renderBackdrop = useCallback(
    (props: any) => <AppBottomSheetBackdrop {...props} />,
    [],
  );

  const workUrl = buildWorkUrl(work.id);
  const message = buildShareMessage(work, workUrl);

  const handleOption = async (id: string) => {
    switch (id) {
      case 'copy': {
        sheetRef.current?.dismiss();
        Clipboard.setString(workUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        if (Platform.OS === 'android') {
          ToastAndroid.show('Link copied!', ToastAndroid.SHORT);
        }
        break;
      }

      case 'native': {
        sheetRef.current?.dismiss();
        try {
          await Share.share(
            Platform.OS === 'ios' ? { url: workUrl, message } : { message },
          );
        } catch {
          // user cancelled — no-op
        }
        break;
      }

      case 'whatsapp': {
        sheetRef.current?.dismiss();
        const waUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
        const canOpen = await Linking.canOpenURL(waUrl);
        if (canOpen) {
          await Linking.openURL(waUrl);
        } else {
          Alert.alert(
            'WhatsApp not installed',
            'Please install WhatsApp to use this option.',
          );
        }
        break;
      }

      case 'facebook': {
        sheetRef.current?.dismiss();
        const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          workUrl,
        )}`;
        await Linking.openURL(fbUrl);
        break;
      }

      case 'viber': {
        sheetRef.current?.dismiss();
        const viberUrl = `viber://forward?text=${encodeURIComponent(message)}`;
        const canOpen = await Linking.canOpenURL(viberUrl);
        if (canOpen) {
          await Linking.openURL(viberUrl);
        } else {
          Alert.alert(
            'Viber not installed',
            'Please install Viber to use this option.',
          );
        }
        break;
      }

      case 'sms': {
        sheetRef.current?.dismiss();
        const sep = Platform.OS === 'ios' ? '&' : '?';
        await Linking.openURL(`sms:${sep}body=${encodeURIComponent(message)}`);
        break;
      }

      case 'email': {
        sheetRef.current?.dismiss();
        const title = work.title || 'Work opportunity';
        const subject = encodeURIComponent(`Check out this work: ${title}`);
        const body = encodeURIComponent(message);
        await Linking.openURL(`mailto:?subject=${subject}&body=${body}`);
        break;
      }
    }
  };

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
          <View className="flex-1 mr-3">
            <Text className="text-lg font-bold text-gray-900">Share work</Text>
            <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>
              {work.title || work.description.slice(0, 48)}
            </Text>
          </View>
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
        <View className="px-4 pt-2">
          {SHARE_OPTIONS.map(opt => {
            const isCopied = opt.id === 'copy' && copied;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => handleOption(opt.id)}
                activeOpacity={0.7}
                className="flex-row items-center py-3.5 border-b border-gray-50"
                accessibilityRole="button"
                accessibilityLabel={opt.label}
              >
                {/* Icon bubble */}
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-4"
                  style={{ backgroundColor: opt.bgColor }}
                >
                  <MaterialIcons
                    name={opt.icon as any}
                    size={20}
                    color={opt.iconColor}
                  />
                </View>

                {/* Label + description */}
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-900">
                    {isCopied ? '✓ Copied!' : opt.label}
                  </Text>
                  <Text className="text-xs text-gray-400">
                    {opt.description}
                  </Text>
                </View>

                <MaterialIcons name="chevron-right" size={20} color="#D1D5DB" />
              </TouchableOpacity>
            );
          })}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
