/**
 * EditWorkScreen
 * Owner-only screen for editing a single field of an existing work.
 *
 * The `field` route param selects the editor:
 *  - 'reward'      → budget amount + budget type (fixed / hourly / negotiable)
 *  - 'description' → free-text description
 *  - 'workType'    → category picker (cleaning, gardening, …)
 *  - 'duration'    → duration value + unit
 *  - 'images'      → work pictures (add / remove)
 *  - 'tags'        → comma-separated tags
 *
 * All changes persist via PATCH /works/:id and the detail query is invalidated.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  uploadImages,
  getImageUrl,
  isVideoUrl,
} from '../../services/minioService';
import { playVideo } from '../../utils';
import { useAuthStore } from '../../store/useAuthStore';
import { useWork, useUpdateWork } from '../../hooks/useWorks';
import { CATEGORIES } from '../../constants';
import {
  HomeStackParamList,
  Work,
  WorkCategory,
  WorkDurationUnit,
} from '../../types';
import type { UpdateWorkData } from '../../services/workService';
import { useHideTabBar } from '../../navigation/useHideTabBar';
import { useWorkCurrency } from '../../hooks';

type EditWorkNavigationProp = NativeStackNavigationProp<
  HomeStackParamList,
  'EditWork'
>;
type EditWorkRouteProp = RouteProp<HomeStackParamList, 'EditWork'>;

const BUDGET_TYPES: {
  value: Work['budgetType'];
  label: string;
}[] = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'hourly', label: 'Per Hour' },
  { value: 'negotiable', label: 'Negotiable' },
];

const DURATION_UNITS: { value: WorkDurationUnit; label: string }[] = [
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
];

const FIELD_TITLES: Record<EditWorkRouteProp['params']['field'], string> = {
  reward: 'Edit Reward',
  description: 'Edit Description',
  workType: 'Edit Work Type',
  duration: 'Edit Duration',
  images: 'Edit Pictures',
  tags: 'Edit Tags',
};

export function EditWorkScreen(): React.JSX.Element {
  useHideTabBar();
  const navigation = useNavigation<EditWorkNavigationProp>();
  const route = useRoute<EditWorkRouteProp>();
  const insets = useSafeAreaInsets();

  const { field } = route.params;

  const [isKeyboardActive, setIsKeyboardActive] = React.useState(false);

  React.useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, () => {
      setIsKeyboardActive(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardActive(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const { user } = useAuthStore();
  const { data: result, isLoading } = useWork(route.params.workId);
  const work = result?.status === 'found' ? result.work : undefined;
  const currencySymbol = useWorkCurrency(work);
  const { mutateAsync: updateWork, isPending } = useUpdateWork();

  const [budget, setBudget] = React.useState('');
  const [budgetType, setBudgetType] =
    React.useState<Work['budgetType']>('fixed');
  const [description, setDescription] = React.useState('');
  const [category, setCategory] = React.useState<WorkCategory | null>(null);
  const [durationValue, setDurationValue] = React.useState('');
  const [durationUnit, setDurationUnit] = React.useState<WorkDurationUnit | ''>(
    '',
  );
  const [uploadedKeys, setUploadedKeys] = React.useState<string[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [tags, setTags] = React.useState('');

  // Seed the form once the work has loaded, without clobbering user edits on
  // later refetches.
  const syncedRef = React.useRef(false);
  const bottomPad = Platform.OS === 'android' ? insets.bottom : 0;

  React.useEffect(() => {
    if (work && !syncedRef.current) {
      syncedRef.current = true;
      setBudget(String(work.budget));
      setBudgetType(work.budgetType);
      setDescription(work.description);
      setCategory(work.category as WorkCategory);
      setDurationValue(work.durationValue ? String(work.durationValue) : '');
      setDurationUnit(work.durationUnit ?? '');
      setUploadedKeys(work.images ?? []);
      setTags(work.tags?.join(', ') ?? '');
    }
  }, [work]);

  const isOwner = !!user && !!work && user.id === work.postedBy.id;

  const handlePickImages = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'mixed',
        selectionLimit: 10,
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.7,
      });

      if (result.didCancel || !result.assets) {
        return;
      }

      const assets = result.assets.filter(a => a.uri);
      if (assets.length === 0) {
        return;
      }

      await handleUpload(assets);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to pick media.');
    }
  };

  const handleUpload = async (mediaInputs: any[]) => {
    if (!user || !work) {
      Alert.alert('Error', 'You must be logged in to upload images.');
      return;
    }

    setUploading(true);
    try {
      const results = await uploadImages(mediaInputs, user.id, work.id);
      const newKeys = results.map(r => r.key);
      setUploadedKeys(prev => [...prev, ...newKeys]);
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Could not upload media.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setUploadedKeys(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!isOwner || !work) return;

    let data: UpdateWorkData;
    if (field === 'reward') {
      const amount = Number(budget);
      if (!budget.trim() || isNaN(amount) || amount <= 0) {
        Alert.alert('Invalid reward', 'Please enter a valid amount.');
        return;
      }
      data = { budget: amount, budgetType };
    } else if (field === 'description') {
      if (!description.trim()) {
        Alert.alert('Description required', 'Please enter a description.');
        return;
      }
      data = { description: description.trim() };
    } else if (field === 'duration') {
      const amount = Number(durationValue);
      if (
        durationUnit &&
        durationValue.trim() &&
        Number.isFinite(amount) &&
        amount > 0
      ) {
        data = { durationValue: Math.round(amount), durationUnit };
      } else if (!durationUnit && !durationValue.trim()) {
        // Clear the duration
        data = { durationValue: null, durationUnit: null };
      } else {
        Alert.alert('Invalid duration', 'Please enter a valid duration.');
        return;
      }
    } else if (field === 'tags') {
      // Comma-separated tags, trimmed, empties dropped, duplicates removed.
      // An empty input clears all tags.
      const parsedTags = Array.from(
        new Set(
          tags
            .split(',')
            .map(t => t.trim())
            .filter(Boolean),
        ),
      );
      data = { tags: parsedTags };
    } else if (field === 'images') {
      data = { images: uploadedKeys };
    } else {
      if (!category) {
        Alert.alert('Work type required', 'Please select a work type.');
        return;
      }
      data = { category };
    }

    try {
      await updateWork({ workId: route.params.workId, data });
      navigation.goBack();
    } catch (err: any) {
      Alert.alert(
        'Update failed',
        err?.message || 'Could not save your changes. Please try again.',
      );
    }
  };
  return (
    <View className="flex-1 bg-gray-50">
      <View style={{ paddingTop: insets.top }} className="bg-white" />
      {/* Header */}
      <View className="bg-white border-b border-gray-200">
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="flex-row items-center mr-3 p-1.5 rounded-full"
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <MaterialIcons name="arrow-back" size={24} color="#111827" />
            <Text className="text-2xl ml-4 font-bold text-gray-900">
              {FIELD_TITLES[field]}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isLoading ? (
            <View className="py-12 items-center">
              <ActivityIndicator size="small" color="#059669" />
            </View>
          ) : !isOwner || !work ? (
            <View className="py-12 items-center">
              <Text className="text-base text-gray-500">
                {work
                  ? 'Only the owner of this work can edit it.'
                  : 'Work not found'}
              </Text>
            </View>
          ) : field === 'reward' ? (
            <>
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Reward amount
              </Text>
              <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-4 mb-5">
                <Text className="text-lg font-semibold text-gray-500">
                  {currencySymbol}
                </Text>
                <TextInput
                  className="flex-1 py-3.5 ml-2 text-xl font-bold text-gray-900"
                  value={budget}
                  onChangeText={setBudget}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Payment type
              </Text>
              <View className="flex-row flex-wrap mb-2">
                {BUDGET_TYPES.map(t => {
                  const active = t.value === budgetType;
                  return (
                    <TouchableOpacity
                      key={t.value}
                      onPress={() => setBudgetType(t.value)}
                      activeOpacity={0.7}
                      className={`mr-2 mb-2 px-4 py-2.5 rounded-full border ${
                        active
                          ? 'bg-emerald-600 border-emerald-600'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          active ? 'text-white' : 'text-gray-700'
                        }`}
                      >
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : field === 'description' ? (
            <>
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Description
              </Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-xl p-4 text-base text-gray-900"
                value={description}
                onChangeText={setDescription}
                placeholder="Describe the work…"
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                style={{ minHeight: 160 }}
              />
            </>
          ) : field === 'duration' ? (
            <>
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Duration value
              </Text>
              <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-4 mb-5">
                <MaterialIcons name="schedule" size={20} color="#6B7280" />
                <TextInput
                  className="flex-1 py-3.5 ml-2 text-xl font-bold text-gray-900"
                  value={durationValue}
                  onChangeText={setDurationValue}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Unit
              </Text>
              <View className="flex-row flex-wrap mb-4">
                {DURATION_UNITS.map(unit => {
                  const active = durationUnit === unit.value;
                  return (
                    <TouchableOpacity
                      key={unit.value}
                      onPress={() => setDurationUnit(unit.value)}
                      activeOpacity={0.7}
                      className={`mr-2 mb-2 px-4 py-2.5 rounded-full border ${
                        active
                          ? 'bg-emerald-600 border-emerald-600'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          active ? 'text-white' : 'text-gray-700'
                        }`}
                      >
                        {unit.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity
                onPress={() => {
                  setDurationValue('');
                  setDurationUnit('');
                }}
                activeOpacity={0.7}
                className="items-start py-2"
              >
                <Text className="text-sm font-semibold text-red-500">
                  Clear duration
                </Text>
              </TouchableOpacity>
            </>
          ) : field === 'tags' ? (
            <>
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Tags <Text className="text-gray-400">(comma separated)</Text>
              </Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900"
                value={tags}
                onChangeText={setTags}
                placeholder="e.g., urgent, weekend, experienced"
                placeholderTextColor="#9CA3AF"
              />
              <Text className="text-sm text-gray-400 mt-2">
                Separate each tag with a comma. Leave empty to remove all tags.
              </Text>
            </>
          ) : field === 'images' ? (
            <>
              <Text className="text-base text-gray-600 mb-4">
                Add or remove photos of the work location.
              </Text>

              {/* Upload button */}
              <TouchableOpacity
                className={`flex-row items-center justify-center bg-emerald-50/15 rounded-xl px-4 py-4 mb-6 border-2 border-dashed border-emerald-300 ${
                  uploading ? 'opacity-50' : ''
                }`}
                activeOpacity={0.7}
                onPress={handlePickImages}
                disabled={uploading}
              >
                <MaterialIcons
                  name="add-photo-alternate"
                  size={24}
                  color="#059669"
                />
                <Text className="ml-2 text-base font-bold text-emerald-700">
                  {uploading ? 'Uploading…' : 'Add Pictures'}
                </Text>
                {uploading && (
                  <ActivityIndicator
                    size="small"
                    color="#059669"
                    className="ml-2"
                  />
                )}
              </TouchableOpacity>

              {/* Image list */}
              {uploadedKeys.length === 0 ? (
                <View className="items-center py-12">
                  <MaterialIcons
                    name="photo-library"
                    size={48}
                    color="#D1D5DB"
                  />
                  <Text className="text-sm text-gray-400 mt-2">
                    No pictures added yet
                  </Text>
                </View>
              ) : (
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {uploadedKeys.map((key, i) => {
                    const isVideo = isVideoUrl(key);
                    const mediaUrl = getImageUrl(key);

                    return (
                      <View
                        key={key + '-' + i}
                        style={{ width: '31%', aspectRatio: 1 }}
                        className="relative rounded-xl overflow-hidden bg-gray-100 mb-2"
                      >
                        {isVideo ? (
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => playVideo(mediaUrl)}
                            className="w-full h-full bg-gray-900 items-center justify-center"
                          >
                            <MaterialIcons
                              name="play-circle-filled"
                              size={32}
                              color="#FFFFFF"
                            />
                            <View className="absolute bottom-1 left-1 bg-black/70 rounded px-1 py-0.5 flex-row items-center">
                              <MaterialIcons
                                name="videocam"
                                size={10}
                                color="#10B981"
                              />
                              <Text className="text-[9px] text-white font-bold tracking-wider ml-0.5">
                                PLAY
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ) : (
                          <Image
                            source={{ uri: mediaUrl }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        )}
                        {/* Remove button overlay */}
                        <TouchableOpacity
                          className="absolute top-1 right-1 bg-black/50 rounded-full p-1"
                          onPress={() => handleRemoveImage(i)}
                          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                        >
                          <MaterialIcons name="close" size={14} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          ) : (
            <>
              <Text className="text-sm font-semibold text-gray-700 mb-3">
                Select a work type
              </Text>
              <View className="flex-row flex-wrap">
                {CATEGORIES.map(cat => {
                  const active = cat.id === category;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setCategory(cat.id)}
                      activeOpacity={0.7}
                      className={`flex-row items-center px-4 py-3 rounded-xl border mr-2 mb-2 ${
                        active
                          ? 'border-emerald-600 bg-emerald-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <MaterialIcons
                        name={cat.icon}
                        size={18}
                        color={active ? '#047857' : '#374151'}
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        className={`text-sm font-semibold ${
                          active ? 'text-emerald-700' : 'text-gray-700'
                        }`}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>

        {/* Save */}
        <View
          className="bg-white border-t border-gray-200 px-5 py-4"
          style={{ paddingBottom: isKeyboardActive ? 16 : bottomPad + 16 }}
        >
          <TouchableOpacity
            className={`rounded-xl py-4 items-center ${
              isPending ? 'bg-emerald-300' : 'bg-emerald-600'
            }`}
            activeOpacity={0.8}
            onPress={handleSave}
            disabled={isPending || isLoading || !isOwner}
          >
            {isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-base font-bold text-white">Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
