import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {auth, signOut} from '../../services/firebaseconfig';
import BackgroundImage from "../assets/Backgroundimage";

const LogoutScreen = () => {
    const handleLogout = async () => {
        try {
            await signOut(auth);
            console.log('Logged out successfully');
        } catch (error) {
            console.error('Logout error:', error.message);
        }
    };

    return (
        <>
            <BackgroundImage />
            <View style={styles.container}>
                <Text style={styles.title}>Logout</Text>
                <TouchableOpacity onPress={handleLogout} style={styles.button}>
                    <Text style={styles.buttonText}>Logout</Text>
                </TouchableOpacity>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 40,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    button: {
        backgroundColor: '#e74c3c',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
    },
    backgroundImage: {
        position: 'absolute',
        width: '100%',
        height: '100%',
    },
});

export default LogoutScreen;
