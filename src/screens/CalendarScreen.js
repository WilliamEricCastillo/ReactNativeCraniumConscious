import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import BackgroundImage from '../assets/Backgroundimage';

const CalendarScreen = () => {
    return (
        <>
            <BackgroundImage />
            <View style={styles.container}>
                <Text style={styles.text}>Calendar Screen</Text>
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
    text: {
        fontSize: 24,
        textAlign: 'center',
    },
});

export default CalendarScreen;
