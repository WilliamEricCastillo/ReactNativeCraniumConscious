import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {auth} from '../../services/firebaseconfig';
import BackgroundImage from "../assets/Backgroundimage";

const backgroundImageSource = require('../assets/background04.jpg');

const HomeScreen = ({navigation}) => {
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            if (user) {
                setCurrentUser(user);
            } else {
                setCurrentUser(null);
            }
        });

        // Clean up subscription on unmount
        return () => unsubscribe();
    }, []);

    // Function to extract username from email
    const getUsernameFromEmail = email => {
        if (email) {
            // Split the email at '@' and take the part before it
            return email.split('@')[0];
        }
        return '';
    };

    return (
        <>
            <BackgroundImage />
            <View style={styles.container}>
                {/*<Button title="HOME" onPress={() => navigation.navigate('About')} />*/}
                {currentUser && (
                    <Text style={styles.welcomeText}>
                        Welcome, {getUsernameFromEmail(currentUser.email).toLowerCase()}!
                    </Text>
                )}
            </View>

            <View style={styles.chartContainer}>
                <Text> Chart </Text>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        width: '90%',
        alignSelf: 'center',
        borderRadius: 10,
        marginTop: 40,
    },
    chartContainer:{
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        width: '90%',
        height: '50%',
        alignSelf: 'center',
        borderRadius: 10,
        marginTop: 40,
    },
    welcomeText: {
        color: 'black',
        fontSize: 25,
        fontWeight: 'bold',
        textAlign: 'center',
        paddingTop: 20,
        paddingBottom: 20,
    },
});

export default HomeScreen;
