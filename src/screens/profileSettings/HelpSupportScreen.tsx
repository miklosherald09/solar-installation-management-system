/**
 * HelpSupportScreen
 * Shows support contacts and a single-field form for submitting
 * comments / concerns / suggestions.  Submission requires the user
 * to be signed in — otherwise they are prompted to log in.
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuthStore } from '../../store/useAuthStore';
import { submitSupportTicket } from '../../services/supportService';
import { ProfileStackParamList } from '../../types';
import { useHideTabBar } from '../../navigation/useHideTabBar';

type NavigationProp = NativeStackNavigationProp<
  ProfileStackParamList,
  'HelpSupport'
>;

const SUPPORT_PHONE = '+639155637373';
const SUPPORT_EMAIL = 'support@solarimsys.online';

interface ContactRowProps {
  icon: string;
  label: string;
  value: string;
  onPress: () => void;
}

function ContactRow({
  icon,
  label,
  value,
  onPress,
}: ContactRowProps): React.JSX.Element {
  return (
    <TouchableOpacity
      className="flex-row items-center px-5 py-4 border-b border-gray-100"
      activeOpacity={0.7}
      onPress={onPress}
    >
      <MaterialIcons name={icon} size={22} color="#059669" />
      <View className="flex-1 ml-3">
        <Text className="text-xs text-gray-500">{label}</Text>
        <Text className="text-base text-gray-900 font-medium">{value}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color="#D1D5DB" />
    </TouchableOpacity>
  );
}

export function HelpSupportScreen(): React.JSX.Element {
  useHideTabBar();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuthStore();

  const [message, setMessage] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const canSubmit = message.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Login Required',
        'Please log in first before sending a message.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ],
      );
      return;
    }

    if (!message.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      const userId = user?.id;
      if (!userId) {
        throw new Error('Unable to identify the signed-in user.');
      }
      await submitSupportTicket(userId, message);
      setMessage('');
      Alert.alert('Sent', 'Thanks! Your message has been sent to our team.');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message ?? 'Failed to send your message. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ height: insets.top }} className="bg-white" />

      {/* Header */}
      <View className="bg-white border-b border-gray-200">
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mr-3 p-1.5 rounded-full"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View className="flex-1 mr-2">
            <Text className="text-2xl font-bold text-gray-900">
              Help & Support
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Support contacts */}
        <Text className="text-xs font-semibold text-gray-500 uppercase mx-5 mt-6 mb-2">
          Contact us
        </Text>
        <View className="bg-white mx-5 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <ContactRow
            icon="phone"
            label="Call"
            value={SUPPORT_PHONE}
            onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}
          />
          <ContactRow
            icon="email"
            label="Email"
            value={SUPPORT_EMAIL}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          />
        </View>

        {/* Message form */}
        <Text className="text-xs font-semibold text-gray-500 uppercase mx-5 mt-6 mb-2">
          Send us a message
        </Text>
        <View className="bg-white mx-5 rounded-2xl shadow-sm border border-gray-100 px-5 py-4">
          <Text className="text-sm text-gray-500 mb-2">
            Comments, concerns, or suggestions
          </Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-3.5 py-3 text-base text-gray-900"
            style={{ minHeight: 120, textAlignVertical: 'top' }}
            value={message}
            onChangeText={setMessage}
            placeholder={
              isAuthenticated
                ? 'Write your message here…'
                : 'Log in to send a message'
            }
            placeholderTextColor="#9CA3AF"
            multiline
            editable={!submitting}
          />

          <TouchableOpacity
            className={`mt-4 rounded-xl py-3.5 items-center flex-row justify-center ${
              canSubmit ? 'bg-[#006742]' : 'bg-gray-200'
            }`}
            activeOpacity={0.8}
            disabled={!canSubmit}
            onPress={handleSubmit}
          >
            {submitting && (
              <View className="mr-2">
                <ActivityIndicator size="small" color="#6B7280" />
              </View>
            )}
            <Text
              className={`text-base font-semibold ${
                canSubmit ? 'text-white' : 'text-gray-500'
              }`}
            >
              {submitting ? 'Sending…' : 'Submit'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
