import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CustomAlert({ visible, title, message, buttons = [], onDismiss }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, damping: 18, stiffness: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.96, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const defaultButtons = [
    { text: 'موافق', onPress: onDismiss, style: 'default' },
  ];

  const finalButtons = buttons.length > 0 ? buttons : defaultButtons;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>
          <View style={styles.buttonsRow}>
            {finalButtons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.button,
                  i === 0 && finalButtons.length > 1 ? styles.buttonSecondary : null,
                  btn.style === 'cancel' ? styles.buttonCancel : null,
                  btn.style === 'destructive' ? styles.buttonDestructive : null,
                  finalButtons.length === 1 ? styles.buttonFull : null,
                ]}
                onPress={() => {
                  btn.onPress?.();
                  onDismiss?.();
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.buttonText,
                    i === 0 && finalButtons.length > 1 ? styles.buttonTextSecondary : null,
                    btn.style === 'cancel' ? styles.buttonTextCancel : null,
                    btn.style === 'destructive' ? styles.buttonTextDestructive : null,
                  ]}
                >
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  container: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    width: Math.min(320, SCREEN_WIDTH - 80),
    overflow: 'hidden',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 15,
    color: '#999999',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  buttonsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#2A2A2A',
  },
  buttonFull: {
    borderLeftWidth: 0,
  },
  buttonSecondary: {
    borderLeftWidth: 0,
  },
  buttonCancel: {
    borderLeftWidth: 1,
    borderLeftColor: '#2A2A2A',
  },
  buttonDestructive: {},
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonTextSecondary: {
    color: '#999999',
    fontWeight: '400',
  },
  buttonTextCancel: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  buttonTextDestructive: {
    color: '#FF3B30',
    fontWeight: '400',
  },
});