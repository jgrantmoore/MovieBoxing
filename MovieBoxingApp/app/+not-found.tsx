import { Stack, Link } from "expo-router";
import { View, StyleSheet, Text } from "react-native";

export default function NotFoundScreen() {
    return (
        <>
            <Stack.Screen options={{ title: "Not Found" }} />
            <View style={styles.container}>
                <Text style={styles.text}>This screen could not be found.</Text>
                <Link href="/" style={styles.link}>
                    <Text style={styles.linkText}>Go to Home</Text>
                </Link>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#020617',
        alignItems: "center",
        justifyContent: "center",
    },
    text: {
        color: "#fff",
        fontSize: 18,
    },
    link: {
        marginTop: 20,
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: "#fff",
        borderRadius: 5,
    },
    linkText: {
        color: "#020617",
        fontSize: 16,
    },
});