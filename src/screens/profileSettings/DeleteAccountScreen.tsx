/**
 * DeleteAccountScreen
 * Final step of the deletion flow (Profile → Privacy & Security → Danger zone).
 *
 * Deletion is irreversible, so the screen is built as a gate rather than a
 * button: the user must read the consequences, tick each one, retype their own
 * email address, wait out a short cool-off, and then confirm a native alert.
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuthStore, signOut } from '../../store/useAuthStore';
import { deleteAccount } from '../../services/authService';
import { ProfileStackParamList } from '../../types';
import { useHideTabBar } from '../../navigation/useHideTabBar';

type NavigationProp = NativeStackNavigationProp<
  ProfileStackParamList,
  'DeleteAccount'
>;

/** Seconds the confirm button stays locked after every requirement is met. */
const COOL_OFF_SECONDS = 5;

const ACKNOWLEDGEMENTS = [
  'I understand I will no longer be able to log in with this account.',
  'I understand my posted works will no longer be reachable by other users.',
  'I understand this cannot be undone, and support cannot restore my account.',
];

interface CheckboxProps {
  checked: boolean;
  label: string;
  onToggle: () => void;
}

function Checkbox({
  checked,
  label,
  onToggle,
}: CheckboxProps): React.JSX.Element {
  return (
    <TouchableOpacity
      className="flex-row items-start px-5 py-3.5 border-b border-gray-100"
      activeOpacity={0.7}
      onPress={onToggle}
    >
      <View
        className={`w-5 h-5 rounded border items-center justify-center mt-0.5 ${
          checked ? 'bg-red-500 border-red-500' : 'bg-white border-gray-300'
        }`}
      >
        {checked && <MaterialIcons name="check" size={14} color="#FFFFFF" />}
      </View>
      <Text className="flex-1 ml-3 text-sm text-gray-700 leading-5">
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function DeleteAccountScreen(): React.JSX.Element {
  useHideTabBar();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const email = user?.email ?? '';

  const [checked, setChecked] = React.useState<boolean[]>(
    ACKNOWLEDGEMENTS.map(() => false),
  );
  const [typedEmail, setTypedEmail] = React.useState('');
  const [secondsLeft, setSecondsLeft] = React.useState(COOL_OFF_SECONDS);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const allAcknowledged = checked.every(Boolean);
  const emailMatches =
    email.length > 0 &&
    typedEmail.trim().toLowerCase() === email.trim().toLowerCase();
  const requirementsMet = allAcknowledged && emailMatches;

  // Cool-off: only starts once everything else is satisfied, and resets if the
  // user unticks a box or edits the email.
  React.useEffect(() => {
    if (!requirementsMet) {
      setSecondsLeft(COOL_OFF_SECONDS);
      return;
    }
    if (secondsLeft <= 0) {
      return;
    }
    const timer = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [requirementsMet, secondsLeft]);

  const canDelete = requirementsMet && secondsLeft <= 0 && !isDeleting;

  const toggle = (index: number) =>
    setChecked(prev => prev.map((v, i) => (i === index ? !v : v)));

  const performDelete = async () => {
    setIsDeleting(true);
    try {
      const userId = user?.id ?? '';
      await deleteAccount(userId);
      await signOut();
      (navigation as any).navigate('HomeTab', { screen: 'Home' });
      Alert.alert(
        'Account Deleted',
        "Your account has been deleted. We're sorry to see you go.",
      );
    } catch (error: any) {
      setIsDeleting(false);
      Alert.alert(
        'Error',
        error?.message ?? 'Failed to delete account. Please try again.',
      );
    }
  };

  const handleConfirm = () => {
    Alert.alert(
      'Delete Account',
      'This is the last step. Your account will be deleted and you will be logged out immediately. Your data is retained for legal purposes but you will no longer be able to log in.',
      [
        { text: 'Keep My Account', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: performDelete,
        },
      ],
    );
  };

  const confirmLabel = isDeleting
    ? 'Deleting…'
    : !requirementsMet
    ? 'Complete the steps above'
    : secondsLeft > 0
    ? `Please wait ${secondsLeft}s…`
    : 'Permanently delete my account';

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
            disabled={isDeleting}
          >
            <MaterialIcons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View className="flex-1 mr-2">
            <Text className="text-2xl font-bold text-gray-900">
              Delete Account
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Warning */}
        <View className="mx-5 mt-6 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
          <View className="flex-row items-center mb-1.5">
            <MaterialIcons name="warning-amber" size={20} color="#DC2626" />
            <Text className="ml-2 text-base font-semibold text-red-700">
              This cannot be undone
            </Text>
          </View>
          <Text className="text-sm text-red-700 leading-5">
            Deleting your account removes your access permanently. Your data is
            retained for legal purposes, but you will not be able to log in
            again or recover your works.
          </Text>
        </View>

        {/* Softer alternative, offered before the gate */}
        <TouchableOpacity
          className="mx-5 mt-4 bg-white rounded-2xl border border-gray-200 px-5 py-4 flex-row items-center"
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
          disabled={isDeleting}
        >
          <MaterialIcons name="logout" size={20} color="#2563EB" />
          <View className="flex-1 ml-3">
            <Text className="text-sm font-semibold text-gray-900">
              Just need a break? Log out instead
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              Go back and use "Log Out" — nothing is deleted.
            </Text>
          </View>
        </TouchableOpacity>

        {/* Step 1 — acknowledgements */}
        <Text className="text-xs font-semibold text-gray-500 uppercase mx-5 mt-8 mb-2">
          Step 1 · Confirm you understand
        </Text>
        <View className="bg-white mx-5 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {ACKNOWLEDGEMENTS.map((label, index) => (
            <Checkbox
              key={label}
              label={label}
              checked={checked[index]}
              onToggle={() => toggle(index)}
            />
          ))}
        </View>

        {/* Step 2 — retype email */}
        <Text className="text-xs font-semibold text-gray-500 uppercase mx-5 mt-6 mb-2">
          Step 2 · Type your email to confirm
        </Text>
        <View className="bg-white mx-5 rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
          <Text className="text-xs text-gray-500 mb-2">
            Type <Text className="font-semibold text-gray-700">{email}</Text>{' '}
            exactly.
          </Text>
          <TextInput
            className={`border rounded-xl px-3.5 py-3 text-base text-gray-900 ${
              typedEmail.length === 0
                ? 'border-gray-200'
                : emailMatches
                ? 'border-green-400'
                : 'border-red-300'
            }`}
            value={typedEmail}
            onChangeText={setTypedEmail}
            placeholder="your@email.com"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!isDeleting}
          />
        </View>

        {/* Step 3 — confirm */}
        <Text className="text-xs font-semibold text-gray-500 uppercase mx-5 mt-6 mb-2">
          Step 3 · Delete
        </Text>
        <TouchableOpacity
          className={`mx-5 rounded-xl py-3.5 items-center flex-row justify-center ${
            canDelete ? 'bg-red-600' : 'bg-gray-200'
          }`}
          activeOpacity={0.8}
          disabled={!canDelete}
          onPress={handleConfirm}
        >
          {isDeleting && (
            <View className="mr-2">
              <ActivityIndicator size="small" color="#6B7280" />
            </View>
          )}
          <Text
            className={`text-base font-semibold ${
              canDelete ? 'text-white' : 'text-gray-500'
            }`}
          >
            {confirmLabel}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="mx-5 mt-3 py-3 items-center"
          onPress={() => navigation.goBack()}
          disabled={isDeleting}
        >
          <Text className="text-base font-semibold text-gray-600">Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
