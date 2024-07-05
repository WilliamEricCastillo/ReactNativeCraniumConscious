import React from 'react';
import {View, Text, ScrollView, StyleSheet, Dimensions} from 'react-native';
import BackgroundImage from "../assets/Backgroundimage";
import { BarChart, LineChart, PieChart, PopulationPyramid } from "react-native-gifted-charts";
import {LinearGradient, Stop} from "react-native-svg";

const screenWidth = Dimensions.get('window').width;
// const chartWidth = screenWidth * 0.95;

const ChartScreen = () => {
    const lineData = [
        {value: 2, dataPointText: '☹️', label: 'Mon'},
        {value: 4, dataPointText: '😊', label: 'Tues'},
        {value: 1, dataPointText: '😠', label: 'Wed'},
        {value: 4, dataPointText: '😊', label: 'Thur'},
        {value: 5, dataPointText: '😍', label: 'Fri'},
        {value: 4, dataPointText: '😊', label: 'Sat'},
        {value: 5, dataPointText: '😍', label: 'Sun'},
    ];
    return (
        <>
            <BackgroundImage/>
            <ScrollView>
                <View style={styles.container}>
                    <View style={styles.chartContainer}>
                        <View style={styles.centeredChart}>
                            <Text style={styles.chartText}>Weekly Mood</Text>
                            <LineChart
                                data={lineData}
                                maxValue={8}
                                textShiftY={-10}
                                textShiftX={-10}
                                textFontSize={25}
                                thickness={3}
                                showVerticalLines
                                // yAxisThickness={1}
                                // yAxisLabelWidth={0}
                                // hideYAxisText
                                // secondaryYAxis
                                hideRules
                                verticalLinesColor="rgba(14,164,164,0.5)"
                                color="#0BA5A4"
                                isAnimated
                                xAxisColor='pink'
                                yAxisColor='pink'
                                curved={true}
                                xAxisLabelTextStyle={{color:'white'}}
                                yAxisTextStyle={{color: '#1a3461'}}
                                lineGradient
                                lineGradientId="ggrd" // same as the id passed in <LinearGradient> below
                                lineGradientComponent={() => {
                                    return (
                                        <LinearGradient id="ggrd" x1="0" y1="0" x2="0" y2="1">
                                            <Stop offset="0" stopColor={'#c33cf0'} />
                                            <Stop offset="0.5" stopColor={'yellow'} />
                                            <Stop offset="1" stopColor={'#FF6347'} />
                                        </LinearGradient>
                                    );
                                }}
                            />
                        </View>
                    </View>
                </View>
            </ScrollView>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chartContainer: {
        marginTop: 25,
        marginBottom: 25,
        alignSelf: 'center',
        borderRadius: 10,
    },
    chartText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        paddingVertical: 10,
        textAlign: 'center',
    },
    centeredChart: {
        color: 'white',
        backgroundColor: '#1a3461',
        borderRadius: 20,
        paddingBottom: 25,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
    },
});

export default ChartScreen;
