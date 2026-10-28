import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { User } from '@/api/types';

export function Avatar({ user, size = 40 }: { user: User; size?: number }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.ink,
          borderColor: colors.card,
        },
      ]}>
      {user.pictureUrl && !failed ? (
        <Image
          source={{ uri: user.pictureUrl }}
          onError={() => setFailed(true)}
          contentFit="cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <Text style={[styles.initial, { color: colors.paper, fontSize: size * 0.36 }]}>
          {user.name.trim().charAt(0) || '序'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
  },
  initial: {
    fontFamily: Fonts.display,
    fontWeight: '600',
  },
});
