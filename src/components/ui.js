import React from 'react';
import {useCallback, useMemo, useRef, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  PanResponder,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {colors, radius, space, MIN_TOUCH} from '../theme/theme';

const SLIDER_PINK = '#F52BCB';
const SLIDER_PURPLE = '#AC32F5';
const SLIDER_BLUE = '#3985FF';

const interpolateSliderColor = (startColor, endColor, amount) => {
  const startChannels = [1, 3, 5].map(offset => parseInt(startColor.slice(offset, offset + 2), 16));
  const endChannels = [1, 3, 5].map(offset => parseInt(endColor.slice(offset, offset + 2), 16));
  const channels = startChannels.map((startChannel, index) =>
    Math.round(startChannel + (endChannels[index] - startChannel) * amount).toString(16).padStart(2, '0'),
  );
  return `#${channels.join('')}`.toUpperCase();
};

const sliderColorAt = fraction => fraction <= 0.5
  ? interpolateSliderColor(SLIDER_PINK, SLIDER_PURPLE, fraction * 2)
  : interpolateSliderColor(SLIDER_PURPLE, SLIDER_BLUE, (fraction - 0.5) * 2);

// `tab` screens have no native header, so they own the top inset; stack screens own the bottom one.
export const Screen = ({children, tab = false, scroll = true, contentStyle, scrollRef, onContentSizeChange}) => (
  <SafeAreaView
    style={styles.screen}
    edges={tab ? ['top'] : ['bottom', 'left', 'right']}>
    {scroll ? (
      <ScrollView
        ref={scrollRef}
        onContentSizeChange={onContentSizeChange}
        contentContainerStyle={[styles.content, contentStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    ) : (
      <View style={[styles.content, {flex: 1}, contentStyle]}>{children}</View>
    )}
  </SafeAreaView>
);

export const Title = ({children, subtitle}) => (
  <View style={{marginBottom: space.lg}}>
    <Text style={styles.title} accessibilityRole="header">
      {children}
    </Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>
);

export const Card = ({children, onPress, style, accent, accessibilityLabel}) => {
  const body = [styles.card, accent && {borderColor: accent}, style];
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        android_ripple={{color: colors.primarySoft}}
        style={body}>
        {children}
      </Pressable>
    );
  }
  return <View style={body}>{children}</View>;
};

export const Button = ({title, onPress, variant = 'primary', icon, disabled, style}) => {
  const primary = variant === 'primary';
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{disabled: !!disabled}}
      disabled={disabled}
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.button,
        primary && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        disabled && styles.buttonDisabled,
        style,
      ]}>
      {primary ? (
        <LinearGradient
          colors={['#E63BBE', colors.primary, colors.blue]}
          start={{x: 0, y: 0.5}}
          end={{x: 1, y: 0.5}}
          style={StyleSheet.absoluteFillObject}
        />
      ) : null}
      {icon ? (
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={primary ? '#FFFFFF' : colors.text}
          style={{marginRight: space.sm}}
        />
      ) : null}
      <Text style={[styles.buttonText, primary && styles.buttonTextPrimary, variant === 'ghost' && {color: colors.textMuted}] }>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

// Standard Save / Cancel pair used by every logging form.
export const FormActions = ({onSave, onCancel, saveDisabled, cancelDisabled, saveTitle = 'Save'}) => (
  <View style={styles.actions}>
    <Button title="Cancel" variant="secondary" onPress={onCancel} disabled={cancelDisabled} style={{flex: 1}} />
    <View style={{width: space.md}} />
    <Button title={saveTitle} onPress={onSave} disabled={saveDisabled} style={{flex: 1}} />
  </View>
);

export const SectionTitle = ({title, action, onAction}) => (
  <View style={styles.sectionRow}>
    <Text style={styles.sectionTitle} accessibilityRole="header">
      {title}
    </Text>
    {action ? (
      <TouchableOpacity onPress={onAction} hitSlop={12} accessibilityRole="button">
        <Text style={styles.sectionAction}>{action}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

export const Chip = ({label, selected, onPress}) => (
  <TouchableOpacity
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{selected: !!selected}}
    style={[styles.chip, selected && styles.chipSelected]}>
    <Text style={[styles.chipText, selected && {color: colors.text}]}>{label}</Text>
  </TouchableOpacity>
);

export const Note = ({children}) => (
  <View style={styles.note}>
    <MaterialCommunityIcons name="information-outline" size={18} color={colors.textMuted} />
    <Text style={styles.noteText}>{children}</Text>
  </View>
);

export const EmptyState = ({icon = 'brain', title, message, actionLabel, onAction}) => (
  <View style={styles.empty}>
    <MaterialCommunityIcons name={icon} size={44} color={colors.primary} />
    <Text style={styles.emptyTitle}>{title}</Text>
    {message ? <Text style={styles.emptyMessage}>{message}</Text> : null}
    {actionLabel ? (
      <Button title={actionLabel} onPress={onAction} style={{marginTop: space.lg}} />
    ) : null}
  </View>
);

export const ListRow = ({icon, title, subtitle, onPress, color = colors.primary, right, disabled, expanded}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityState={{disabled: !!disabled, ...(expanded != null ? {expanded} : {})}}
    accessibilityRole="button"
    accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
    android_ripple={{color: colors.primarySoft}}
    style={styles.row}>
    {icon ? (
      <View style={[styles.rowIcon, {backgroundColor: `${color}26`}]}>
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      </View>
    ) : null}
    <View style={{flex: 1}}>
      <Text style={styles.rowTitle}>{title}</Text>
      {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
    </View>
    {right || (
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
    )}
  </Pressable>
);

export const Field = ({label, style, ...props}) => (
  <View style={{marginBottom: space.lg}}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <TextInput
      placeholderTextColor={colors.textMuted}
      style={[styles.input, style]}
      accessibilityLabel={label}
      {...props}
    />
  </View>
);

export const ScaleSelector = ({value, onChange, max = 5, color = colors.primary, lowLabel, highLabel}) => (
  <View>
    <View style={styles.scaleRow}>
      {Array.from({length: max}, (_, i) => i + 1).map(n => {
        const selected = value === n;
        return (
          <TouchableOpacity
            key={n}
            onPress={() => onChange(n)}
            accessibilityRole="button"
            accessibilityLabel={`${n} of ${max}`}
            accessibilityState={{selected}}
            style={[
              styles.scaleButton,
              selected && {backgroundColor: color, borderColor: color},
            ]}>
            <Text style={[styles.scaleText, selected && styles.scaleTextSelected]}>{n}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
    {lowLabel || highLabel ? (
      <View style={styles.scaleLabels}>
        <Text style={styles.rowSubtitle}>{lowLabel}</Text>
        <Text style={styles.rowSubtitle}>{highLabel}</Text>
      </View>
    ) : null}
  </View>
);

export const RatingSlider = ({value, onChange, label, lowLabel, highLabel, min = 1, max = 10}) => {
  const trackRef = useRef(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const [trackLeft, setTrackLeft] = useState(0);
  const fraction = value == null ? 0 : Math.max(0, Math.min(1, (value - min) / (max - min)));
  const positionColor = sliderColorAt(fraction);

  const updateFromX = useCallback(pageX => {
    if (!trackWidth) return;
    const position = Math.max(0, Math.min(trackWidth, pageX - trackLeft));
    onChange(Math.round(min + (position / trackWidth) * (max - min)));
  }, [max, min, onChange, trackLeft, trackWidth]);

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 4 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderGrant: event => updateFromX(event.nativeEvent.pageX),
    onPanResponderMove: (_, gesture) => updateFromX(gesture.moveX),
  }), [updateFromX]);

  const onAccessibilityAction = event => {
    const next = event.nativeEvent.actionName === 'increment' ? (value ?? min) + 1 : (value ?? min) - 1;
    onChange(Math.max(min, Math.min(max, next)));
  };

  const marks = Array.from({length: max - min + 1}, (_, index) => min + index);

  return (
    <View>
      <View
        ref={trackRef}
        style={styles.ratingSliderTouch}
        onLayout={event => {
          setTrackWidth(event.nativeEvent.layout.width);
          trackRef.current?.measureInWindow(x => setTrackLeft(x));
        }}
        onTouchEnd={event => {
          const touch = event.nativeEvent.changedTouches?.[0];
          if (touch) updateFromX(touch.pageX);
        }}
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{min, max, now: value ?? undefined, text: value == null ? 'Not set' : `${value} of ${max}`}}
        accessibilityActions={[{name: 'increment'}, {name: 'decrement'}]}
        onAccessibilityAction={onAccessibilityAction}
        {...responder.panHandlers}>
        <View style={styles.ratingTrack}>
          {value != null ? (
            <LinearGradient
              colors={[SLIDER_PINK, SLIDER_PURPLE, SLIDER_BLUE]}
              locations={[0, 0.5, 1]}
              start={{x: 0, y: 0.5}}
              end={{x: 1, y: 0.5}}
              style={[styles.ratingFill, {width: `${fraction * 100}%`}]}
            />
          ) : null}
        </View>
        <View style={[styles.ratingThumb, {left: `${fraction * 100}%`, borderColor: positionColor, shadowColor: positionColor}]} />
        {value != null ? (
          <View style={[styles.ratingValue, {left: `${fraction * 100}%`, backgroundColor: positionColor}]}>
            <Text style={styles.ratingValueText}>{value}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.ratingMarks}>
        {marks.map(mark => <Text key={mark} style={styles.ratingMark}>{mark}</Text>)}
      </View>
      {lowLabel || highLabel ? (
        <View style={styles.scaleLabels}>
          <Text style={styles.rowSubtitle}>{lowLabel}</Text>
          <Text style={styles.rowSubtitle}>{highLabel}</Text>
        </View>
      ) : null}
    </View>
  );
};

export const Stepper = ({value, onChange, step = 1, min = 0, max = 999, unit}) => (
  <View style={styles.stepper}>
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Decrease"
      onPress={() => onChange(Math.max(min, +(value - step).toFixed(2)))}
      style={styles.stepButton}>
      <MaterialCommunityIcons name="minus" size={26} color={colors.text} />
    </TouchableOpacity>
    <View style={{alignItems: 'center', minWidth: 96}}>
      <Text style={styles.stepValue}>{value}</Text>
      {unit ? <Text style={styles.rowSubtitle}>{unit}</Text> : null}
    </View>
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Increase"
      onPress={() => onChange(Math.min(max, +(value + step).toFixed(2)))}
      style={styles.stepButton}>
      <MaterialCommunityIcons name="plus" size={26} color={colors.text} />
    </TouchableOpacity>
  </View>
);

// Simple native bar chart. A null value means "nothing logged" and shows a small grey stub, never a real bar.
export const MiniBars = ({values, labels, color = colors.primary, height = 90, max}) => {
  const top = max ?? Math.max(...values.map(v => v ?? 0), 1);
  return (
    <View style={[styles.bars, {height: height + 22}]}>
      {values.map((v, i) => (
        <View key={i} style={styles.barCol}>
          <View
            style={[
              styles.bar,
              v == null
                ? {height: 4, backgroundColor: colors.border}
                : {height: Math.max(4, (v / top) * height), backgroundColor: color},
            ]}
          />
          {labels ? <Text style={styles.barLabel}>{labels[i]}</Text> : null}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: 'transparent'},
  content: {padding: space.lg, paddingBottom: space.xl * 2},
  title: {color: colors.text, fontSize: 28, fontWeight: '700'},
  subtitle: {color: colors.textMuted, fontSize: 15, marginTop: space.xs},
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    marginBottom: space.md,
    overflow: 'hidden',
  },
  button: {
    minHeight: MIN_TOUCH,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonPrimary: {backgroundColor: 'transparent', overflow: 'hidden', borderRadius: radius.md},
  buttonSecondary: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border},
  buttonDisabled: {opacity: 0.45},
  buttonText: {color: colors.text, fontSize: 16, fontWeight: '700'},
  buttonTextPrimary: {color: '#FFFFFF'},
  actions: {flexDirection: 'row', marginTop: space.lg},
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.lg,
    marginBottom: space.md,
  },
  sectionTitle: {color: colors.text, fontSize: 18, fontWeight: '700'},
  sectionAction: {color: colors.primary, fontSize: 15, fontWeight: '600'},
  chip: {
    minHeight: 40,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.sm,
    marginBottom: space.sm,
  },
  chipSelected: {backgroundColor: colors.primary, borderColor: colors.primary},
  chipText: {color: colors.textMuted, fontSize: 14, fontWeight: '600'},
  note: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: space.md,
    marginVertical: space.md,
  },
  noteText: {color: colors.textMuted, fontSize: 13, lineHeight: 19, flex: 1, marginLeft: space.sm},
  empty: {alignItems: 'center', padding: space.xl},
  emptyTitle: {color: colors.text, fontSize: 18, fontWeight: '700', marginTop: space.md},
  emptyMessage: {color: colors.textMuted, textAlign: 'center', marginTop: space.sm, lineHeight: 20},
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    marginBottom: space.sm,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.md,
  },
  rowTitle: {color: colors.text, fontSize: 16, fontWeight: '600'},
  rowSubtitle: {color: colors.textMuted, fontSize: 13, marginTop: 2},
  label: {color: colors.textMuted, fontSize: 14, fontWeight: '600', marginBottom: space.sm},
  input: {
    minHeight: MIN_TOUCH,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    color: colors.text,
    fontSize: 16,
  },
  scaleRow: {flexDirection: 'row', justifyContent: 'space-between'},
  scaleButton: {
    flex: 1,
    height: MIN_TOUCH,
    marginHorizontal: 3,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleText: {color: colors.text, fontSize: 16, fontWeight: '700'},
  scaleTextSelected: {color: '#FFFFFF'},
  scaleLabels: {flexDirection: 'row', justifyContent: 'space-between', marginTop: space.sm},
  ratingSliderTouch: {height: 54, justifyContent: 'center', marginHorizontal: 8},
  ratingTrack: {height: 12, borderRadius: 6, backgroundColor: '#E7E6F4', overflow: 'hidden'},
  ratingFill: {height: '100%', borderRadius: 6},
  ratingThumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    marginLeft: -12,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#612A86',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 3,
  },
  ratingValue: {
    position: 'absolute',
    top: 0,
    minWidth: 34,
    height: 28,
    marginLeft: -17,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingValueText: {color: '#FFFFFF', fontSize: 14, fontWeight: '700'},
  ratingMarks: {flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 4, marginTop: 2},
  ratingMark: {flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: 12, fontWeight: '600'},
  stepper: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center'},
  stepButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {color: colors.text, fontSize: 36, fontWeight: '700'},
  bars: {flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between'},
  barCol: {flex: 1, alignItems: 'center', justifyContent: 'flex-end'},
  bar: {width: 14, borderRadius: 7},
  barLabel: {color: colors.textMuted, fontSize: 11, marginTop: 6},
});
