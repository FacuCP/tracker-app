import { Linking, StyleSheet, Text, TextStyle } from 'react-native';

interface Props {
  text: string;
  style?: TextStyle;
  linkStyle?: TextStyle;
}

const URL_REGEX = /((?:https?:\/\/|www\.)[^\s]+)/gi;

function openLink(url: string) {
  const href = url.startsWith('http') ? url : `https://${url}`;
  Linking.openURL(href).catch(() => {});
}

/** Texto plano donde los links (http(s):// o www.) son tocables y se abren afuera. */
export function LinkedText({ text, style, linkStyle }: Props) {
  // Con un solo grupo de captura, split() intercala texto plano (índices
  // pares) y links (índices impares) — no hace falta re-testear el regex.
  const parts = text.split(URL_REGEX);

  return (
    <Text style={style}>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <Text
            key={index}
            style={[styles.link, linkStyle]}
            onPress={() => openLink(part)}
            suppressHighlighting
          >
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  link: {
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
});
