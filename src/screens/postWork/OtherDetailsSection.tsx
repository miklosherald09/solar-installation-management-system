import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { DatePickerModal } from '../../components';
import { dateToYmd, formatDisplayDate } from './helpers';
import { DurationField } from './DurationField';

interface Props {
  scheduledDate: string;
  setScheduledDate: (v: string) => void;
  tags: string;
  setTags: (v: string) => void;
  durationDisplay: string;
  onDurationPress: () => void;
}

export function OtherDetailsSection({
  scheduledDate,
  setScheduledDate,
  tags,
  setTags,
  durationDisplay,
  onDurationPress,
}: Props) {
  const [showOtherDetails, setShowOtherDetails] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Parse the stored date string for the picker (defaults to today if empty)
  const pickerDate = scheduledDate
    ? new Date(scheduledDate + 'T00:00:00')
    : new Date();

  const handleDateSelected = (date: Date) => {
    setScheduledDate(dateToYmd(date));
    setShowDatePicker(false);
  };

  const handleClearDate = () => {
    setScheduledDate('');
    setShowDatePicker(false);
  };

  return (
    <>
      {/* Other Details Toggle */}
      <TouchableOpacity
        className="flex-row items-center justify-between mb-5"
        activeOpacity={0.7}
        onPress={() => setShowOtherDetails(!showOtherDetails)}
      >
        <Text className="text-lg font-semibold text-gray-700">
          Other Details
        </Text>
        <MaterialIcons
          name={showOtherDetails ? 'expand-less' : 'expand-more'}
          size={28}
          color="#6B7280"
        />
      </TouchableOpacity>

      {showOtherDetails && (
        <>
          {/* Duration */}
          <DurationField display={durationDisplay} onPress={onDurationPress} />

          {/* Scheduled Date */}
          <View className="mb-5">
            <Text className="text-sm font-semibold text-gray-800 mb-2">
              Preferred Date <Text className="text-gray-400">(optional)</Text>
            </Text>
            <TouchableOpacity
              className={`flex-row items-center justify-between bg-white border rounded-xl px-4 py-3.5 ${
                scheduledDate ? 'border-emerald-400' : 'border-gray-200'
              }`}
              activeOpacity={0.7}
              onPress={() => setShowDatePicker(true)}
            >
              <View className="flex-row items-center flex-1">
                <MaterialIcons
                  name="calendar-today"
                  size={18}
                  color={scheduledDate ? '#059669' : '#9CA3AF'}
                />
                <Text
                  className={`ml-2 text-base ${
                    scheduledDate
                      ? 'text-gray-900 font-medium'
                      : 'text-gray-400'
                  }`}
                >
                  {scheduledDate
                    ? formatDisplayDate(scheduledDate)
                    : 'Select a date…'}
                </Text>
              </View>
              {scheduledDate ? (
                <TouchableOpacity
                  onPress={handleClearDate}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialIcons name="close" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
          </View>

          {/* Tags */}
          <View className="mb-8">
            <Text className="text-sm font-semibold text-gray-800 mb-2">
              Tags{' '}
              <Text className="text-gray-400">(optional, comma separated)</Text>
            </Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900"
              value={tags}
              onChangeText={setTags}
              placeholder="e.g., urgent, weekend, experienced"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </>
      )}

      <DatePickerModal
        visible={showDatePicker}
        value={pickerDate}
        minimumDate={new Date()}
        title="Preferred Date"
        onChange={handleDateSelected}
        onClose={() => setShowDatePicker(false)}
      />
    </>
  );
}
