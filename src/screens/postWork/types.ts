import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../types';

export type PostWorkNav = NativeStackNavigationProp<
  HomeStackParamList,
  'PostWork'
>;

export type BudgetType = 'fixed' | 'hourly' | 'negotiable';
