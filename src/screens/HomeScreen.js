import React, {useEffect, useState} from 'react';
import {Dimensions, Image, StyleSheet, Text, View} from 'react-native';
import {auth} from '../../services/firebaseconfig';
import BackgroundImage from "../assets/Backgroundimage";
import headerImageSource from "../assets/headerlogo.png";
import {
    LineChart,
    BarChart,
    PieChart,
    ProgressChart,
    ContributionGraph,
    StackedBarChart
} from 'react-native-chart-kit'

const screenWidth = Dimensions.get('window').width;

const HeaderWithLogo = () => (
    <View style={styles.headerLogoContainer}>
        <Image
            style={styles.logoImageContainer}
            source={headerImageSource}
        />
    </View>
);

const linedata = {
    labels: ['Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat', 'Sun'],
    datasets: [
        {
            data: [4, 2, 4, 1, 2, 4, 5],
            strokeWidth: 5,
        },
    ],
};

const barData = {
    labels: ['January', 'February', 'March', 'April', 'May', 'June'],
    datasets: [
        {
            data: [20, 45, 28, 80, 99, 43],
        },
    ],
};

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
                <Text style={styles.chartText}>
                    Weekly Mood Tracker
                </Text>

                <LineChart
                    data={linedata}
                    width={Dimensions.get('window').width} // from react-native
                    height={220}
                    yAxisLabel={''}
                    chartConfig={{
                        backgroundColor: '#27AE60',
                        backgroundGradientFrom: '#27AE60',
                        backgroundGradientTo: '#27AE60',
                        decimalPlaces: 2, // optional, defaults to 2dp
                        color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                        style: {
                            borderRadius: 16
                        }
                    }}
                    bezier
                    style={{
                        marginVertical: 8,
                        borderRadius: 16
                    }}
                />
            </View>

            <View style={styles.chartContainer2}>
                <Text style={styles.chartText}>
                    Journal Streak
                </Text>
                <BarChart
                    // style={graphStyle}
                    data={barData}
                    width={screenWidth}
                    height={220}
                    yAxisLabel={''}
                    chartConfig={{
                        backgroundColor: '#A569BD',
                        backgroundGradientFrom: '#A569BD',
                        backgroundGradientTo: '#A569BD',
                        decimalPlaces: 2, // optional, defaults to 2dp
                        color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                        style: {
                            borderRadius: 16
                        }
                    }}
                />
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor:'#5499C7',
        width: '75%',
        alignSelf: 'center',
        marginTop: 20,
        borderRadius: 40,

    },

    chartContainer:{
        backgroundColor: '#27AE60',
        width: '100%',
        height: 'auto',
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 40,
        marginTop: 40,
    },
    chartContainer2:{
        backgroundColor: '#A569BD',
        width: '100%',
        height: 'auto',
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 40,
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
        fontSize: 20,
        color: 'white',
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
