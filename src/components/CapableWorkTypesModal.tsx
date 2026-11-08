/**
 * CapableWorkTypesModal
 *
 * A polished onboarding modal that asks the user to select which work types
 * they are skilled at / willing to perform.  Shown on the home screen the
 * first time an authenticated user has no saved capable work types.
 *
 * Features:
 *  - Multi-select grid of all active work types (2 columns)
 *  - Emerald checkmark + border glow when selected
 *  - "Save" persists to backend & auth store
 *  - "Skip for now" persists a dismiss flag so it never shows again
 *  - Also usable in "edit" mode from profile settings (pre-populated)
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWorkTypes } from '../hooks';
import { WorkType } from '../types';
import { saveCapableWorkTypes } from '../services/userService';
import { setAuthUser, useAuthStore } from '../store/useAuthStore';
import { MINIO_ENDPOINT } from '../services/minioService';

/**
 * Base AsyncStorage key for the capable-work-types onboarding prompt.
 * Scoped per user (suffixed with `:userId`) so one user's dismissal never
 * blocks another user on the same device. Once set, the modal is never shown
 * again for that user.
 */
export const CAPABLE_WORK_TYPES_DISMISSED_KEY =
  '@solarimsys:capableWorkTypesPromptDismissed';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** When true, the modal is in edit mode: "Skip" becomes "Cancel" and the
   *  dismiss flag is NOT set on skip/cancel. */
  editMode?: boolean;
}

// ─── Work Type Grid Item ──────────────────────────────────────────────
function WorkTypeGridItem({
  workType,
  isSelected,
  onToggle,
}: {
  workType: WorkType;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const [imageError, setImageError] = React.useState(false);
  const hasImage = !!workType.image && !imageError;

  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.7}
      className={`flex-1 mx-1.5 mb-3 rounded-2xl border-2 overflow-hidden ${
        isSelected
          ? 'border-emerald-500 bg-emerald-50'
          : 'border-gray-100 bg-white'
      }`}
    >
      {/* Thumbnail */}
      <View className="w-full h-20 bg-gray-200 items-center justify-center overflow-hidden">
        {hasImage ? (
          <Image
            source={{ uri: `${MINIO_ENDPOINT}${workType.image}` }}
            // eslint-disable-next-line react-native/no-inline-styles
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <Text className="text-3xl">{workType.icon || '🛠️'}</Text>
        )}
        {/* Selected check overlay */}
        {isSelected && (
          <View className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-emerald-500 items-center justify-center">
            <MaterialIcons name="check" size={16} color="#FFFFFF" />
          </View>
        )}
      </View>

      {/* Label */}
      <View className="px-2.5 py-2 items-center">
        <Text
          className={`text-xs font-semibold text-center ${
            isSelected ? 'text-emerald-700' : 'text-gray-700'
          }`}
          numberOfLines={2}
        >
          {workType.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────
export function CapableWorkTypesModal({
  visible,
  onClose,
  editMode = false,
}: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const capableDismissKey = user?.id
    ? `${CAPABLE_WORK_TYPES_DISMISSED_KEY}:${user.id}`
    : null;
  const { data: workTypes, isLoading } = useWorkTypes();

  // Track which slugs are selected
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Pre-populate when opening in edit mode
  React.useEffect(() => {
    if (visible && user?.capableWorkTypes) {
      setSelectedSlugs(new Set(user.capableWorkTypes));
    } else if (visible) {
      setSelectedSlugs(new Set());
    }
  }, [visible, user?.capableWorkTypes]);

  const toggleSlug = useCallback((slug: string) => {
    setSelectedSlugs(prev => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!user) return;

    setSaving(true);
    try {
      const slugs = Array.from(selectedSlugs);
      await saveCapableWorkTypes(user.id, slugs);
      setAuthUser({ ...user, capableWorkTypes: slugs });

      // Persist this user's dismiss flag so the modal doesn't show again
      if (capableDismissKey) {
        await AsyncStorage.setItem(capableDismissKey, 'true');
      }

      onClose();
    } catch (err) {
      console.warn('[CapableWorkTypes] Save failed:', err);
    } finally {
      setSaving(false);
    }
  }, [user, selectedSlugs, onClose, capableDismissKey]);

  const handleExplicitSkip = useCallback(async () => {
    if (!editMode && capableDismissKey) {
      // Persist this user's dismiss flag so the modal never shows again
      await AsyncStorage.setItem(capableDismissKey, 'true');
    }
    onClose();
  }, [editMode, onClose, capableDismissKey]);

  const handleDismissTemporary = useCallback(() => {
    onClose();
  }, [onClose]);

  // ── 2-column grid data ──
  const gridData = useMemo(() => {
    if (!workTypes) return [];
    // Pad to even length for 2-column grid
    const items = [...workTypes];
    if (items.length % 2 !== 0) {
      items.push({
        id: '__pad__',
        name: '',
        slug: '',
        description: '',
        color: '',
        image: '',
        icon: '',
        sortOrder: 999,
        isActive: false,
        createdAt: '',
        updatedAt: '',
      });
    }
    return items;
  }, [workTypes]);

  const renderItem = useCallback(
    ({ item }: { item: WorkType }) => {
      if (item.id === '__pad__') {
        return <View className="flex-1 mx-1.5 mb-3" />;
      }
      return (
        <WorkTypeGridItem
          workType={item}
          isSelected={selectedSlugs.has(item.slug)}
          onToggle={() => toggleSlug(item.slug)}
        />
      );
    },
    [selectedSlugs, toggleSlug],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismissTemporary}
    >
      <View className="flex-1">
        {/* Dimmed backdrop */}
        <Pressable
          className="absolute inset-0 bg-black/60"
          onPress={handleDismissTemporary}
          accessibilityRole="button"
          accessibilityLabel="Close modal"
        />

        <View
          className="flex-1 justify-end"
          style={{ paddingTop: insets.top + 40 }}
        >
          <View className="bg-white rounded-t-3xl overflow-hidden flex-1">
            {/* ── Header ─────────────────────────────────── */}
            <View className="px-6 pt-6 pb-3">
              {/* Drag handle */}
              <View className="self-center w-10 h-1 rounded-full bg-gray-300 mb-5" />

              <View className="flex-row items-center mb-2">
                <View className="w-10 h-10 rounded-full bg-emerald-100 items-center justify-center mr-3">
                  <MaterialIcons name="handyman" size={22} color="#059669" />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-bold text-gray-900">
                    What work can you do?
                  </Text>
                </View>
              </View>
              <Text className="text-sm text-gray-500 leading-5">
                Select the types of work you're skilled at. This helps
                people find and hire you for the right jobs.
              </Text>
            </View>

            {/* ── Grid ───────────────────────────────────── */}
            {isLoading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#059669" />
                <Text className="text-sm text-gray-400 mt-3">
                  Loading work types…
                </Text>
              </View>
            ) : (
              <FlatList
                data={gridData}
                keyExtractor={item => item.id}
                numColumns={2}
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  paddingTop: 12,
                  paddingBottom: 16,
                }}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
              />
            )}

            {/* ── Bottom action bar ──────────────────────── */}
            <View
              className="px-6 pt-3 pb-2 border-t border-gray-100 bg-white"
              style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            >
              {/* Selected count badge */}
              {selectedSlugs.size > 0 && (
                <Text className="text-xs text-emerald-600 font-semibold mb-2 text-center">
                  {selectedSlugs.size} work type{selectedSlugs.size > 1 ? 's' : ''} selected
                </Text>
              )}

              {/* Save button */}
              <TouchableOpacity
                className={`rounded-xl py-3.5 items-center ${
                  selectedSlugs.size > 0 && !saving
                    ? 'bg-[#006742]'
                    : 'bg-gray-300'
                }`}
                activeOpacity={0.8}
                onPress={handleSave}
                disabled={selectedSlugs.size === 0 || saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-base font-bold text-white">
                    Save My Skills
                  </Text>
                )}
              </TouchableOpacity>

              {/* Skip / Cancel */}
              <TouchableOpacity
                className="py-3 items-center"
                activeOpacity={0.7}
                onPress={editMode ? handleDismissTemporary : handleExplicitSkip}
              >
                <Text className="text-sm font-medium text-gray-400">
                  {editMode ? 'Cancel' : 'Skip for now'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
