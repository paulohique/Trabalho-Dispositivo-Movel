import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Colors } from '@/constants/Colors';

interface NeomorphBoxProps {
  children: React.ReactNode;
  style?: object;
}

export const NeomorphBox: React.FC<NeomorphBoxProps> = ({ children, style }) => {
  return (
    <View style={[styles.neomorphBox, style]}>
      <View style={[styles.neomorphInner]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  neomorphBox: {
    borderRadius: 15,
    backgroundColor: Colors.light.white,
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 0.8,
        shadowRadius: 5,
      },
      android: {
        elevation: 8,
      },
    }),
    margin: 10
  },
  neomorphInner: {
    borderRadius: 15,
    backgroundColor: Colors.light.white,
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.lightShadow,
        shadowOffset: { width: -6, height: -6 },
        shadowOpacity: 0.5,
        shadowRadius: 5,
      },
    }),
    overflow: 'hidden'
  }
});