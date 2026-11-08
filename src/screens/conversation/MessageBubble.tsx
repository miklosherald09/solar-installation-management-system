import React from 'react';
import { View, Text, Image, TouchableOpacity, Linking } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { ConversationMessage } from '../../types';
import { formatRelativeTime } from './helpers';

interface Props {
  message: ConversationMessage;
  isMine: boolean;
  /** When false, the time label is hidden (e.g. same minute as the next message). */
  showTime?: boolean;
  showSenderName?: boolean;
  isLastInGroup?: boolean;
}

interface CallLogData {
  type: 'call_log';
  status: 'completed' | 'missed';
  duration: number;
}

function parseCallLog(content: string): CallLogData | null {
  if (content.startsWith('{"type":"call_log"')) {
    try {
      const parsed = JSON.parse(content);
      if (parsed && parsed.type === 'call_log') {
        return parsed as CallLogData;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

function isImageUrl(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  const trimmed = content.trim();
  return (
    trimmed.startsWith('http') &&
    (/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(trimmed) ||
      trimmed.includes('/chats/') ||
      trimmed.includes('/works/'))
  );
}

interface LocationMessageData {
  address: string;
  mapUrl?: string;
}

function parseLocationMessage(content: string): LocationMessageData | null {
  if (!content || typeof content !== 'string') return null;
  if (
    content.startsWith('📍 Location:') ||
    (content.includes('📍') && content.includes('maps.google.com'))
  ) {
    const lines = content.split('\n');
    const firstLine = lines[0]
      .replace('📍 Location:', '')
      .replace('📍', '')
      .trim();
    const mapLine = lines.find(l => l.includes('http'));
    return {
      address: firstLine || 'Shared Location',
      mapUrl: mapLine?.trim(),
    };
  }
  return null;
}

export function MessageBubble({
  message,
  isMine,
  showTime = true,
  showSenderName = true,
  isLastInGroup = true,
}: Props) {
  // Group consecutive messages closely, separate groups with more space
  const containerMargin = isLastInGroup ? 'mb-4' : 'mb-1';
  const callLog = parseCallLog(message.content);

  if (callLog) {
    const isCompleted = callLog.status === 'completed';

    // Format duration
    let durationText = '';
    if (isCompleted) {
      const sec = callLog.duration || 0;
      if (sec < 60) {
        durationText = `${sec}s`;
      } else {
        const min = Math.floor(sec / 60);
        const remainingSec = sec % 60;
        durationText = `${min}m ${remainingSec}s`;
      }
    }

    // Determine details
    let title = '';
    let iconName = '';
    let iconColor = '';
    let textColor = '';

    if (isMine) {
      // Outgoing call
      textColor = 'text-white';
      iconColor = '#FFFFFF';
      if (isCompleted) {
        title = `Outgoing call • ${durationText}`;
        iconName = 'call-made';
      } else {
        title = 'Call unanswered';
        iconName = 'call';
      }
    } else {
      // Incoming call
      textColor = isCompleted ? 'text-gray-800' : 'text-red-500 font-semibold';
      iconColor = isCompleted ? '#4B5563' : '#EF4444';
      if (isCompleted) {
        title = `Incoming call • ${durationText}`;
        iconName = 'call-received';
      } else {
        title = 'Missed call';
        iconName = 'call-missed';
      }
    }

    return (
      <View
        className={`${containerMargin} px-4 ${
          isMine ? 'items-end' : 'items-start'
        }`}
      >
        {!isMine && showSenderName && message.senderName ? (
          <Text className="text-xs text-gray-400 mb-1 ml-2">
            {message.senderName}
          </Text>
        ) : null}

        <View
          className={`max-w-[80%] rounded-2xl px-4 py-2.5 flex-row items-center ${
            isMine
              ? 'bg-emerald-600 rounded-br-md'
              : 'bg-white border border-gray-200 rounded-bl-md'
          }`}
        >
          <MaterialIcons
            name={iconName}
            size={18}
            color={iconColor}
            style={{ marginRight: 6 }}
          />
          <Text className={`text-base ${textColor}`}>{title}</Text>
        </View>

        {showTime && message.createdAt ? (
          <Text
            className={`text-xs text-gray-400 mt-1 ${isMine ? 'mr-2' : 'ml-2'}`}
          >
            {formatRelativeTime(message.createdAt)}
          </Text>
        ) : null}
      </View>
    );
  }

  const isImage = isImageUrl(message.content);
  const locationData = parseLocationMessage(message.content);

  return (
    <View
      className={`${containerMargin} px-4 ${
        isMine ? 'items-end' : 'items-start'
      }`}
    >
      {!isMine && showSenderName && message.senderName ? (
        <Text className="text-xs text-gray-400 mb-1 ml-2">
          {message.senderName}
        </Text>
      ) : null}

      {isImage ? (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => Linking.openURL(message.content).catch(() => {})}
          className={`rounded-2xl overflow-hidden ${
            isMine
              ? 'bg-emerald-600 rounded-br-md'
              : 'bg-white border border-gray-200 rounded-bl-md'
          }`}
        >
          <Image
            source={{ uri: message.content }}
            style={{ width: 220, height: 220, borderRadius: 12 }}
            resizeMode="cover"
          />
        </TouchableOpacity>
      ) : locationData ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() =>
            locationData.mapUrl &&
            Linking.openURL(locationData.mapUrl).catch(() => {})
          }
          className={`max-w-[80%] rounded-2xl p-3 ${
            isMine
              ? 'bg-emerald-600 rounded-br-md'
              : 'bg-white border border-gray-200 rounded-bl-md'
          }`}
        >
          <View className="flex-row items-center mb-1">
            <MaterialIcons
              name="location-on"
              size={18}
              color={isMine ? '#FFFFFF' : '#EF4444'}
              style={{ marginRight: 4 }}
            />
            <Text
              className={`text-xs font-semibold ${
                isMine ? 'text-emerald-100' : 'text-gray-500'
              }`}
            >
              Shared Location
            </Text>
          </View>
          <Text
            className={`text-sm font-medium ${
              isMine ? 'text-white' : 'text-gray-800'
            }`}
          >
            {locationData.address}
          </Text>
          {locationData.mapUrl ? (
            <Text
              className={`text-xs mt-1.5 underline ${
                isMine ? 'text-emerald-100' : 'text-emerald-600'
              }`}
            >
              View on Google Maps
            </Text>
          ) : null}
        </TouchableOpacity>
      ) : (
        <View
          className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
            isMine
              ? 'bg-emerald-600 rounded-br-md'
              : 'bg-white border border-gray-200 rounded-bl-md'
          }`}
        >
          <Text
            className={`text-base leading-5 ${
              isMine ? 'text-white' : 'text-gray-800'
            }`}
          >
            {message.content}
          </Text>
        </View>
      )}

      {showTime && message.createdAt ? (
        <Text
          className={`text-xs text-gray-400 mt-1 ${isMine ? 'mr-2' : 'ml-2'}`}
        >
          {formatRelativeTime(message.createdAt)}
        </Text>
      ) : null}
    </View>
  );
}
