import React from 'react';
import { SafeAreaView, ImageBackground, StyleSheet, Dimensions, StatusBar } from 'react-native';

const screenHeight = Dimensions.get('window').height;
const screenWidth = Dimensions.get('window').width;
const backgroundImageSource = require('./background04.jpg');

const BackgroundImage = () => {
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <ImageBackground
                source={backgroundImageSource}
                resizeMode="stretch" // You can also try "cover" or other modes
                style={styles.img}>
            </ImageBackground>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
    },
    img: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        height: screenHeight,
        width: screenWidth,
    }
});

export default BackgroundImage;
