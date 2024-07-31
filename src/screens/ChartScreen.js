import React from 'react';
import {View, Text, ScrollView, StyleSheet, Dimensions} from 'react-native';
import BackgroundImage from "../assets/Backgroundimage";
import { BarChart, LineChart, PieChart, PopulationPyramid } from "react-native-gifted-charts";
import {LinearGradient, Stop} from "react-native-svg";

import PieChartComponent from "../screens/GraphComponents/PieChartComponent"

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth * 0.95;

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

    const barData = [
        {value: 250, label: 'M'},
        {value: 500, label: 'T', frontColor: '#177AD5'},
        {value: 745, label: 'W', frontColor: '#177AD5'},
        {value: 320, label: 'T'},
        {value: 600, label: 'F', frontColor: '#177AD5'},
        {value: 256, label: 'S'},
        {value: 300, label: 'S'},
    ];

    const pieData = [
        {
            value: 47,
            color: '#009FFF',
            gradientCenterColor: '#006DFF',
            focused: true,
        },
        {value: 40, color: '#93FCF8', gradientCenterColor: '#3BE9DE'},
        {value: 16, color: '#BDB2FA', gradientCenterColor: '#8F80F3'},
        {value: 3, color: '#FFA5BA', gradientCenterColor: '#FF7F97'},
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

                    <View style={styles.chartContainer2}>
                        <View style={styles.centeredChart2}>
                            <Text style={styles.chartText2}>Yearly Journal Entries</Text>
                            <BarChart
                                barWidth={22}
                                noOfSections={3}
                                barBorderRadius={4}
                                frontColor="#ED6665"
                                data={barData}
                                yAxisThickness={0}
                                showReferenceLine1
                                referenceLine1Config={{
                                    color: 'gray',
                                    dashWidth: 2,
                                    dashGap: 3,
                                }}
                                xAxisLabelTextStyle={{color:'black'}}
                                yAxisTextStyle={{color: 'black'}}
                                isAnimated
                                xAxisColor={'black'}
                                rulesColor={'black'}
                            />
                        </View>
                    </View>

                    <View style={styles.chartContainer}>
                        <View style={styles.centeredChart}>
                            <Text style={styles.chartText}>Yearly Journal Entries</Text>
                    <PieChartComponent/>
                        </View>
                    </View>

                    </View>
            </ScrollView>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: "column",
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chartContainer: {
        marginTop: 25,
        marginBottom: 10,
        paddingTop:10,
        paddingBottom: 10,
        paddingRight: 10,
        paddingLeft: 10,
        width: chartWidth,
        borderRadius: 20,
        alignSelf: 'center',
        backgroundColor: "#34448B",
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
        backgroundColor: '#232B5D',
        borderRadius: 20,
        paddingBottom: 25,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
    },
    chartContainer2: {
        marginTop: 25,
        marginBottom: 10,
        paddingTop:10,
        paddingBottom: 10,
        paddingRight: 10,
        paddingLeft: 10,
        width: chartWidth,
        borderRadius: 20,
        alignSelf: 'center',
        backgroundColor: "#c65102",
    },
    chartText2: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'black',
        paddingVertical: 10,
        textAlign: 'center',
    },
    centeredChart2: {
        color: 'white',
        backgroundColor: '#008080',
        borderRadius: 20,
        paddingBottom: 25,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
    },
});

export default ChartScreen;
