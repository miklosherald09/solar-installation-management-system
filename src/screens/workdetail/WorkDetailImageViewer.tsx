import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  imageUrls: string[];
  initialIndex: number;
  onClose: () => void;
}

export function WorkDetailImageViewer({
  visible,
  imageUrls,
  initialIndex,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const [viewerIndex, setViewerIndex] = React.useState(initialIndex);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black">
        <StatusBar barStyle="light-content" />

        {/* Viewer Header */}
        <View style={{ height: insets.top }} className="bg-black" />
        <View className="flex-row items-center justify-between px-4 py-3">
          <TouchableOpacity
            onPress={onClose}
            className="p-2"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="text-base font-semibold text-white">
            {viewerIndex + 1} / {imageUrls.length}
          </Text>
          {/* Spacer for centering */}
          <View style={{ width: 44 }} />
        </View>

        {/* Image Slider */}
        <FlatList
          data={imageUrls}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_data, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          onMomentumScrollEnd={e => {
            const newIndex = Math.round(
              e.nativeEvent.contentOffset.x / SCREEN_WIDTH,
            );
            setViewerIndex(newIndex);
          }}
          renderItem={({ item }) => (
            <View
              style={{
                width: SCREEN_WIDTH,
                height: SCREEN_HEIGHT - insets.top - 80,
              }}
              className="items-center justify-center px-2"
            >
              <Image
                source={{ uri: item }}
                style={{
                  width: SCREEN_WIDTH,
                  height: SCREEN_HEIGHT * 0.6,
                }}
                resizeMode="contain"
              />
            </View>
          )}
          keyExtractor={(_, index) => String(index)}
        />
      </View>
    </Modal>
  );
}
