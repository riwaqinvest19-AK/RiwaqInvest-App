import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  I18nManager,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getInstantAssistantReply } from '@/lib/chatbotReply';

type Msg = { id: string; role: 'user' | 'assistant'; text: string };

const BRAND = '#154375';
const TAB_BAR_CLEARANCE = 64;

export function FloatingAssistantChat() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);

  const welcome = useMemo(
    () => ({
      id: 'welcome',
      role: 'assistant' as const,
      text: t('dashboard.chatbotWelcome'),
    }),
    [t],
  );

  const displayMsgs = msgs.length === 0 ? [welcome] : msgs;

  const smartCtx = useMemo(
    () => ({
      topUpReply: t('dashboard.chatbotReplyTopUp'),
      investReply: t('dashboard.chatbotReplyInvest'),
      returnsReply: t('dashboard.chatbotReplyReturns'),
      verifyReply: t('dashboard.chatbotReplyVerify'),
    }),
    [t],
  );

  const quickLabelMap = useMemo(
    () => ({
      invest: t('dashboard.chatbotQuickInvest'),
      returns: t('dashboard.chatbotQuickReturns'),
      topUp: t('dashboard.chatbotQuickTopUp'),
      verify: t('dashboard.chatbotQuickVerify'),
    }),
    [t],
  );

  const quickQuestions = useMemo(
    () => [
      t('dashboard.chatbotQuickInvest'),
      t('dashboard.chatbotQuickReturns'),
      t('dashboard.chatbotQuickTopUp'),
      t('dashboard.chatbotQuickVerify'),
    ],
    [t],
  );

  const pushAssistantReply = useCallback(
    (question: string) => {
      const reply =
        getInstantAssistantReply(question, smartCtx, quickLabelMap) ||
        t('dashboard.chatbotFallback');
      setMsgs((m) => [
        ...m,
        { id: `a_${Date.now()}`, role: 'assistant', text: reply },
      ]);
    },
    [quickLabelMap, smartCtx, t],
  );

  const sendQuestion = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || busy) return;
      setInput('');
      const userMsg: Msg = { id: `u_${Date.now()}`, role: 'user', text: q };
      setMsgs((m) => [...m, userMsg]);
      setBusy(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 480));
        pushAssistantReply(q);
      } finally {
        setBusy(false);
      }
    },
    [busy, pushAssistantReply],
  );

  const send = useCallback(async () => {
    await sendQuestion(input);
  }, [input, sendQuestion]);

  const goFaq = useCallback(() => {
    setOpen(false);
    router.push('/(tabs)/profile/faq' as Href);
  }, [router]);

  const alignEnd = I18nManager.isRTL ? 'left' : 'right';
  const fabBottom = insets.bottom + TAB_BAR_CLEARANCE;

  return (
    <>
      <KeyboardAvoidingView
        pointerEvents="box-none"
        className="absolute z-50"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom + TAB_BAR_CLEARANCE : 0}
        style={{ bottom: fabBottom, right: 16 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('dashboard.chatbotFabA11y')}
          onPress={() => setOpen(true)}
          className="h-14 w-14 items-center justify-center rounded-full bg-brand-navy shadow-lg"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 8,
          }}>
          <Ionicons name="chatbubbles" size={26} color="#fff" />
        </Pressable>
      </KeyboardAvoidingView>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View className="flex-1 justify-end bg-black/45">
              <Pressable className="flex-1" onPress={() => setOpen(false)} />
              <View
                className="max-h-[82%] rounded-t-3xl bg-white"
                style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
                <View className="flex-row items-center justify-between border-b border-slate-200 px-4 py-3">
                  <Pressable
                    accessibilityRole="button"
                    hitSlop={12}
                    onPress={() => setOpen(false)}
                    className="p-1">
                    <Ionicons name="close" size={26} color={BRAND} />
                  </Pressable>
                  <Text className="flex-1 text-center font-cairo-bold text-base text-brand-navy">
                    {t('dashboard.chatbotTitle')}
                  </Text>
                  <Pressable accessibilityRole="button" hitSlop={12} onPress={goFaq} className="p-1">
                    <Ionicons name="help-circle-outline" size={26} color={BRAND} />
                  </Pressable>
                </View>

                <FlatList
                  ref={listRef}
                  data={displayMsgs}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
                  onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
                  ListFooterComponent={
                    !busy ? (
                      <View className="mt-2 flex-row flex-wrap gap-2" style={{ justifyContent: 'flex-end' }}>
                        {quickQuestions.map((label) => (
                          <Pressable
                            key={label}
                            accessibilityRole="button"
                            onPress={() => void sendQuestion(label)}
                            className="rounded-full border border-brand-navy/25 bg-white px-3 py-1.5 active:opacity-80">
                            <Text className="font-cairo text-xs text-brand-navy">{label}</Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null
                  }
                  renderItem={({ item }) => (
                    <View
                      className={`max-w-[90%] rounded-2xl px-3 py-2.5 ${
                        item.role === 'user' ? 'self-end bg-brand-navy' : 'self-start bg-slate-100'
                      }`}>
                      <Text
                        className={`font-cairo text-sm leading-5 ${item.role === 'user' ? 'text-white' : 'text-neutral-800'}`}
                        style={{ textAlign: alignEnd as 'left' | 'right' }}>
                        {item.text}
                      </Text>
                    </View>
                  )}
                />

                {busy ? (
                  <View className="items-center py-2">
                    <ActivityIndicator color={BRAND} />
                  </View>
                ) : null}

                <View className="flex-row items-end gap-2 border-t border-slate-100 px-3 pb-2 pt-2">
                  <TextInput
                    value={input}
                    onChangeText={setInput}
                    placeholder={t('dashboard.chatbotPlaceholder')}
                    placeholderTextColor="#94a3b8"
                    className="min-h-[44px] max-h-28 min-w-0 flex-1 rounded-2xl border border-slate-200 px-3 py-2.5 font-cairo text-sm text-neutral-900"
                    style={{ textAlign: alignEnd as 'left' | 'right' }}
                    multiline
                    editable={!busy}
                    onFocus={() => {
                      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
                    }}
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy || !input.trim()}
                    onPress={() => void send()}
                    className="mb-0.5 h-11 w-11 items-center justify-center rounded-full bg-brand-navy disabled:opacity-40">
                    <Ionicons
                      name="send"
                      size={20}
                      color="#fff"
                      style={{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }}
                    />
                  </Pressable>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
