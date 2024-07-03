import React, {useEffect, useState} from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {auth} from '../../services/firebaseconfig';
import BackgroundImage from "../assets/Backgroundimage";
import headerImageSource from "../assets/headerlogo.png";

const backgroundImageSource = require('../assets/background04.jpg');

const HeaderWithLogo = () => (
    <View style={styles.headerLogoContainer}>
        <Image
            style={styles.logoImageContainer}
            source={headerImageSource}
        />
    </View>
);
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
            <HeaderWithLogo/>
            <View style={styles.container}>
                {currentUser && (
                    <Text style={styles.welcomeText}>
                        Welcome, {getUsernameFromEmail(currentUser.email).toLowerCase()}!
                    </Text>
                )}
            </View>

            <View style={styles.chartContainer}>
                <Text style={styles.chartText}>Chart</Text>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        width: '90%',
        alignSelf: 'center',
        borderRadius: 10,
        marginTop: 20,
    },
    chartContainer:{
        backgroundColor: 'white',
        width: '90%',
        height: '50%',
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
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
    chartText: {
        fontWeight: 'bold',
        fontSize: 25,
    },
    headerLogoContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingTop: 10,
        paddingLeft: 10,
    },
    logoImageContainer: {
        width: 125,
        height: 50,
        resizeMode: 'stretch',
    }
});

export default HomeScreen;
