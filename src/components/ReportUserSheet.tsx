/**
 * ReportUserSheet
 * Bottom sheet modal for reporting another user. Presents a reason picker
 * (radio buttons) and a message text input. Mirrors the ReviewSheet pattern.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { AppBottomSheetBackdrop } from './AppBottomSheetBackdrop';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { reportUser, ReportReason } from '../services/supportService';

const REASONS: { value: ReportReason; label: string; icon: string }[] = [
  { value: 'harassment', label: 'Harassment or abuse', icon: 'report' },
  { value: 'scam', label: 'Scam or fraud', icon: 'money-off' },
  { value: 'fakery', label: 'Fake profile or credentials', icon: 'person-off' },
  { value: 'unsafe', label: 'Unsafe behavior', icon: 'warning' },
  { value: 'other', label: 'Other', icon: 'more-horiz' },
];

interface ReportUserSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  reporterId: string;
  reportedUserId: string;
  reportedUserName: string;
  bottomPad?: number;
}

export function ReportUserSheet({
  sheetRef,
  reporterId,
  reportedUserId,
  reportedUserName,
  bottomPad = 24,
}: ReportUserSheetProps): React.JSX.Element {
  const [reason, setReason] = React.useState<ReportReason | null>(null);
  const [message, setMessage] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const canSubmit = !!reason && message.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!reason || !message.trim()) return;

    setSubmitting(true);
    try {
      await reportUser(reporterId, reportedUserId, reason, message);
      sheetRef.current?.dismiss();
      setReason(null);
      setMessage('');
      Alert.alert(
        'Report submitted',
        'Thank you for helping keep our community safe. We will review your report shortly.',
      );
    } catch (err: any) {
      Alert.alert(
        'Could not submit report',
        err?.message || 'Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={['70%']}
      backdropComponent={AppBottomSheetBackdrop}
      enablePanDownToClose={!submitting}
      handleIndicatorStyle={{ backgroundColor: '#D1D5DB', width: 40 }}
    >
      <BottomSheetScrollView
        style={{ paddingBottom: Math.max(bottomPad, 24) }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 40,
        }}
      >
        {/* Header */}
        <View className="flex-row items-center mb-1">
          <MaterialIcons name="flag" size={22} color="#DC2626" />
          <Text className="text-lg font-bold text-gray-900 ml-2">
            Report {reportedUserName}
          </Text>
        </View>
        <Text className="text-sm text-gray-500 mb-5">
          Your report is confidential. The reported user will not know who filed
          the report.
        </Text>

        {/* Reason picker */}
        <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
          Reason for report
        </Text>
        {REASONS.map(r => (
          <TouchableOpacity
            key={r.value}
            className={`flex-row items-center px-4 py-3.5 rounded-xl mb-2 border ${
              reason === r.value
                ? 'border-red-300 bg-red-50'
                : 'border-gray-200 bg-white'
            }`}
            activeOpacity={0.7}
            onPress={() => setReason(r.value)}
          >
            <MaterialIcons
              name={r.icon as any}
              size={20}
              color={reason === r.value ? '#DC2626' : '#6B7280'}
            />
            <Text
              className={`ml-3 text-base flex-1 ${
                reason === r.value
                  ? 'text-red-700 font-semibold'
                  : 'text-gray-700'
              }`}
            >
              {r.label}
            </Text>
            <MaterialIcons
              name={
                reason === r.value
                  ? 'radio-button-checked'
                  : 'radio-button-unchecked'
              }
              size={20}
              color={reason === r.value ? '#DC2626' : '#D1D5DB'}
            />
          </TouchableOpacity>
        ))}

        {/* Message */}
        <Text className="text-xs font-semibold text-gray-500 uppercase mt-4 mb-2">
          Details
        </Text>
        <View className="bg-white border border-gray-200 rounded-xl mb-2">
          <BottomSheetTextInput
            className="px-4 py-3 text-base text-gray-900"
            style={{ minHeight: 80, textAlignVertical: 'top' }}
            value={message}
            onChangeText={setMessage}
            placeholder="Describe what happened..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={1000}
          />
        </View>
        {message.length > 0 && (
          <Text className="text-xs text-gray-400 text-right mb-3">
            {message.length}/1000
          </Text>
        )}

        {/* Submit */}
        <TouchableOpacity
          className={`rounded-xl py-3.5 items-center mt-2 ${
            canSubmit ? 'bg-red-600' : 'bg-gray-300'
          }`}
          activeOpacity={0.8}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-base font-bold text-white">
              Submit Report
            </Text>
          )}
        </TouchableOpacity>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
