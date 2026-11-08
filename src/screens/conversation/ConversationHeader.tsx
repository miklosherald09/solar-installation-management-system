import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { getInitials } from './helpers';
import { ConversationWorkInfo } from './ConversationWorkInfo';

interface Props {
  partnerName: string;
  partnerPhoto?: string | null;
  partnerId?: string;
  subtitle?: string;
  topInset: number;
  onBack: () => void;
  /** When provided, tapping the partner's avatar/name opens their profile. */
  onPressPartner?: () => void;
  /** When provided, the call icon is wired to this handler. */
  onCall?: () => void;
  /** When provided, a video-call button is shown next to the call icon. */
  onVideoCall?: () => void;
  /** When provided, work details are shown below the partner info. */
  workId?: string;
}

function PartnerAvatar({
  name,
  photo,
}: {
  name: string;
  photo?: string | null;
}) {
  const [imgError, setImgError] = React.useState(false);

  if (!photo || imgError) {
    return (
      <View className="w-10 h-10 rounded-full bg-emerald-100 items-center justify-center mr-3">
        <Text className="text-sm font-bold text-emerald-600">
          {getInitials(name)}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: photo }}
      style={{ width: 40, height: 40, borderRadius: 20 }}
      className="mr-3 bg-gray-200"
      onError={() => setImgError(true)}
    />
  );
}

export function ConversationHeader({
  partnerName,
  partnerPhoto,
  partnerId,
  // subtitle = 'Chat',
  topInset,
  onBack,
  onPressPartner,
  onCall,
  // onVideoCall,
  workId,
}: Props) {
  const displayName = partnerName || 'Chat';

  const partnerInfo = (
    <>
      <PartnerAvatar name={displayName} photo={partnerPhoto} />
      <View className="flex-1 mr-2">
        <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
          {displayName}
        </Text>
        {/* <Text className="text-xs text-gray-400" numberOfLines={1}>
          {subtitle}
        </Text> */}
      </View>
    </>
  );

  return (
    <View className="bg-white border-b border-gray-200">
      <View style={{ height: topInset }} />
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity
          onPress={onBack}
          className="mr-3 p-1.5 rounded-full"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        {onPressPartner ? (
          <TouchableOpacity
            className="flex-1 flex-row items-center"
            activeOpacity={0.6}
            onPress={onPressPartner}
          >
            {partnerInfo}
          </TouchableOpacity>
        ) : (
          <View className="flex-1 flex-row items-center">{partnerInfo}</View>
        )}

        {onCall ? (
          <TouchableOpacity
            onPress={onCall}
            className="ml-2 p-2 rounded-full bg-emerald-50"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Call partner"
          >
            <MaterialIcons name="call" size={22} color="#059669" />
          </TouchableOpacity>
        ) : null}

        {/* {onVideoCall ? (
          <TouchableOpacity
            onPress={onVideoCall}
            className="ml-2 p-2 rounded-full bg-emerald-50"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Video call partner"
          >
            <MaterialIcons name="videocam" size={22} color="#059669" />
          </TouchableOpacity>
        ) : null} */}
      </View>

      {workId ? (
        <ConversationWorkInfo
          workId={workId}
          partnerId={partnerId}
          partnerName={partnerName}
        />
      ) : null}
    </View>
  );
}
