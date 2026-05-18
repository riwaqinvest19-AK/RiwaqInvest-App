import type { ReactNode } from 'react';
import { I18nManager, Text, TextInput, type TextInputProps, View } from 'react-native';

type LabeledFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Renders at the “start” edge of the row (right in RTL). */
  startAdornment?: ReactNode;
  /** Renders at the “end” edge of the row (left in RTL). */
  endAdornment?: ReactNode;
} & Pick<
  TextInputProps,
  | 'keyboardType'
  | 'secureTextEntry'
  | 'autoCapitalize'
  | 'autoComplete'
  | 'textContentType'
  | 'editable'
  | 'returnKeyType'
  | 'onSubmitEditing'
  | 'blurOnSubmit'
>;

export function LabeledField({
  label,
  value,
  onChangeText,
  placeholder,
  startAdornment,
  endAdornment,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  autoComplete,
  textContentType,
  editable = true,
  returnKeyType,
  onSubmitEditing,
  blurOnSubmit,
}: LabeledFieldProps) {
  const isRtl = I18nManager.isRTL;
  const textAlign = isRtl ? 'right' : 'left';
  const writingDirection = isRtl ? 'rtl' : 'ltr';

  return (
    <View className="w-full">
      <Text
        className="mb-1.5 font-cairo text-sm text-gray-800"
        style={{ textAlign, writingDirection }}>
        {label}
      </Text>
      <View
        className="min-h-[52px] flex-row items-stretch overflow-hidden rounded-2xl px-3"
        style={{ backgroundColor: editable ? '#F8F9FA' : '#F1F5F9' }}>
        {startAdornment ? <View className="justify-center pr-1">{startAdornment}</View> : null}
        <TextInput
          className="min-h-[48px] flex-1 py-3 font-cairo text-base text-gray-900"
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          textContentType={textContentType}
          editable={editable}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={blurOnSubmit}
          style={{ textAlign, writingDirection }}
        />
        {endAdornment ? <View className="justify-center pl-1">{endAdornment}</View> : null}
      </View>
    </View>
  );
}
