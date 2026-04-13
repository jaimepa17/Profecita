import { Text, TextProps, StyleSheet } from 'react-native';

export function CustomText(props: TextProps) {
  return <Text {...props} style={[styles.font, props.style]} />;
}

const styles = StyleSheet.create({
  font: {
    fontFamily: 'Fredoka',
  },
});
