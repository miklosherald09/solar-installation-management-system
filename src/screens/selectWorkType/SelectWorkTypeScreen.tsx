/**
 * SelectWorkTypeScreen
 * Thin composer — assembles the atomic work-type picker pieces.
 * Holds the selection state and returns the chosen type to PostWork.
 */

import React from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useWorkTypes } from '../../hooks';
import {
  applyWorkTypes,
  usePostWorkFormStore,
} from '../../store/usePostWorkFormStore';
import { WorkType } from '../../types';
import { SelectWorkTypeNav } from './types';
import { SelectWorkTypeHeader } from './SelectWorkTypeHeader';
import { WorkTypeList } from './WorkTypeList';
import { SelectButton } from './SelectButton';
import { useHideTabBar } from '../../navigation/useHideTabBar';

export function SelectWorkTypeScreen(): React.JSX.Element {
  useHideTabBar();
  const navigation = useNavigation<SelectWorkTypeNav>();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'android' ? insets.bottom : 0;
  const { data: workTypes, isLoading } = useWorkTypes();
  const { categories, category } = usePostWorkFormStore();

  const initialSlugs = React.useMemo(() => {
    if (categories && categories.length > 0) {
      return new Set(categories);
    }
    if (category) {
      return new Set([category]);
    }
    return new Set<string>();
  }, [categories, category]);

  const [selectedSlugs, setSelectedSlugs] =
    React.useState<Set<string>>(initialSlugs);

  const handleToggle = (workType: WorkType) => {
    setSelectedSlugs(prev => {
      const next = new Set(prev);
      if (next.has(workType.slug)) {
        next.delete(workType.slug);
      } else {
        next.add(workType.slug);
      }
      return next;
    });
  };

  const handleSelect = () => {
    if (selectedSlugs.size === 0) {
      return;
    }
    const chosenTypes = (workTypes ?? []).filter(wt =>
      selectedSlugs.has(wt.slug),
    );
    applyWorkTypes(chosenTypes);
    navigation.goBack();
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View style={{ height: insets.top }} className="bg-gray-50" />
      <SelectWorkTypeHeader onBack={() => navigation.goBack()} />
      <WorkTypeList
        workTypes={workTypes ?? []}
        isLoading={isLoading}
        selectedSlugs={selectedSlugs}
        onToggle={handleToggle}
      />
      <SelectButton
        enabled={selectedSlugs.size > 0}
        count={selectedSlugs.size}
        onPress={handleSelect}
        bottomInset={bottomPad}
      />
    </View>
  );
}
