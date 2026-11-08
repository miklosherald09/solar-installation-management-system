import React from 'react';
import { Modal, View, Text, TouchableOpacity, Alert } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface Props {
  visible: boolean;
  onCreateAnother: () => void;
  onSeePostedWorks: () => void;
}

export function WorkPostedModal({
  visible,
  onCreateAnother,
  onSeePostedWorks,
}: Props) {
  const handleBoost = () => {
    Alert.alert('Coming Soon', 'Boost Work is coming soon.');
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View className="w-full bg-white rounded-2xl p-6 items-center">
          <View className="w-16 h-16 rounded-full bg-emerald-100 items-center justify-center mb-4">
            <MaterialIcons name="check" size={36} color="#059669" />
          </View>

          <Text className="text-xl font-bold text-gray-900 mb-2">
            Work Posted!
          </Text>
          <Text className="text-sm text-gray-500 text-center mb-6">
            Your work has been posted successfully.
          </Text>

          <View className="flex-row w-full gap-3">
            <TouchableOpacity
              className="flex-1 py-3.5 rounded-xl border border-emerald-600 items-center"
              activeOpacity={0.7}
              onPress={onCreateAnother}
            >
              <Text className="text-sm font-semibold text-emerald-700">
                Create Another Work
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 py-3.5 rounded-xl bg-emerald-600 items-center"
              activeOpacity={0.8}
              onPress={onSeePostedWorks}
            >
              <Text className="text-sm font-semibold text-white">
                See Posted Works
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className="flex-row items-center justify-center py-3 mt-1"
            activeOpacity={0.7}
            onPress={handleBoost}
          >
            <MaterialIcons name="rocket-launch" size={18} color="#006742" />
            <Text className="ml-1.5 text-sm font-semibold text-emerald-700">
              Boost Work
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
