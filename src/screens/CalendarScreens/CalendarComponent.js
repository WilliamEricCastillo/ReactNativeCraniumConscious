import React, {useState, useEffect} from 'react';
import {SafeAreaView, StyleSheet, TouchableOpacity, View, Modal, Text, ScrollView, StatusBar} from 'react-native';
import {Calendar} from 'react-native-calendars';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import JournalEntryScreen from './JournalEntryComponent.js';
import {format} from 'date-fns-tz';
import BackgroundImage from '../../assets/Backgroundimage';

const CalendarComponent = () => {
  const [selectedDate, setSelectedDate] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [minDate, setMinDate] = useState('');

  useEffect(() => {
    const currentDate = new Date().toISOString().split('T')[0];
    setSelectedDate(currentDate);

    const formattedMinDate = format(new Date(), 'yyyy-MM-dd', {
      timeZone: 'America/Chicago',
    });
    setMinDate(formattedMinDate);
  }, []);

  const handleDayPress = day => {
    setSelectedDate(day.dateString);
  };

  const markedDates = {};

  if (selectedDate) {
    markedDates[selectedDate] = {
      selected: true,
      selectedColor: '#316FF6',
    };
  }

  const JournalEntryModalContent = ({date, onClose}) => (
    <View style={styles.modalContainer}>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <MaterialCommunityIcons
            name="close-circle-outline"
            size={50}/>
      </TouchableOpacity>
      <JournalEntryScreen route={{ params: { date } }} onClose={onClose} />
    </View>
  );

  return (
    <>
      <BackgroundImage />

      <SafeAreaView style={styles.container}>
        <Calendar
          onDayPress={handleDayPress}
          style={{
            borderRadius: 5,
            margin: 20,
            elevation: 20,
            borderWidth: 4,
            borderColor: 'rgba(100, 100, 100, 0.9)',
          }}
          markedDates={markedDates}
          maxDate={minDate}
        />
      </SafeAreaView>

      <View style={styles.flexRow}>
        <Text style={styles.selectedDateText}>{selectedDate}</Text>

        <SafeAreaView style={styles.safeAreaContainer}>
          <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollViewContent}
              persistentScrollbar={true}
          >
            <View style={styles.journalContainer}>
              <Text style={styles.chartText}>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Amet est placerat in egestas. Vestibulum mattis ullamcorper velit sed ullamcorper morbi. Ante in nibh mauris cursus. Neque gravida in fermentum et sollicitudin ac orci phasellus egestas. In hac habitasse platea dictumst quisque sagittis purus. Morbi tristique senectus et netus et malesuada fames ac. Eu sem integer vitae justo eget magna fermentum iaculis eu. Faucibus pulvinar elementum integer enim. Consequat ac felis donec et odio pellentesque diam volutpat.
                Venenatis tellus in metus vulputate. Amet tellus cras adipiscing enim eu turpis. Donec ultrices tincidunt arcu non. Mauris vitae ultricies leo integer malesuada. Egestas purus viverra accumsan in nisl. Massa placerat duis ultricies lacus sed turpis. Ac turpis egestas integer eget. Gravida neque convallis a cras semper auctor neque. Faucibus pulvinar elementum integer enim neque. Cursus risus at ultrices mi. Cras adipiscing enim eu turpis egestas pretium. Cras pulvinar mattis nunc sed. Urna neque viverra justo nec ultrices dui. Eget nunc lobortis mattis aliquam.</Text>
            </View>
            <View style={styles.journalContainer}>
              <Text style={styles.chartText}>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ac orci phasellus egestas tellus rutrum tellus pellentesque eu. Euismod lacinia at quis risus sed vulputate odio ut enim. Congue mauris rhoncus aenean vel elit scelerisque mauris pellentesque. Mauris cursus mattis molestie a iaculis at. Vel pharetra vel turpis nunc. Tristique magna sit amet purus. Scelerisque purus semper eget duis at tellus at urna. Netus et malesuada fames ac turpis egestas integer eget aliquet. Pellentesque elit ullamcorper dignissim cras tincidunt lobortis feugiat vivamus. Sagittis purus sit amet volutpat consequat. Lorem ipsum dolor sit amet consectetur.</Text>
            </View>
            <View style={styles.journalContainer}>
              <Text style={styles.chartText}>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Amet est placerat in egestas. Vestibulum mattis ullamcorper velit sed ullamcorper morbi. Ante in nibh mauris cursus. Neque gravida in fermentum et sollicitudin ac orci phasellus egestas. In hac habitasse platea dictumst quisque sagittis purus. Morbi tristique senectus et netus et malesuada fames ac. Eu sem integer vitae justo eget magna fermentum iaculis eu. Faucibus pulvinar elementum integer enim. Consequat ac felis donec et odio pellentesque diam volutpat.
                Venenatis tellus in metus vulputate. Amet tellus cras adipiscing enim eu turpis. Donec ultrices tincidunt arcu non. Mauris vitae ultricies leo integer malesuada. Egestas purus viverra accumsan in nisl. Massa placerat duis ultricies lacus sed turpis. Ac turpis egestas integer eget. Gravida neque convallis a cras semper auctor neque. Faucibus pulvinar elementum integer enim neque. Cursus risus at ultrices mi. Cras adipiscing enim eu turpis egestas pretium. Cras pulvinar mattis nunc sed. Urna neque viverra justo nec ultrices dui. Eget nunc lobortis mattis aliquam.</Text>
            </View>
            <View style={styles.journalContainer}>
              <Text style={styles.chartText}>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ac orci phasellus egestas tellus rutrum tellus pellentesque eu. Euismod lacinia at quis risus sed vulputate odio ut enim. Congue mauris rhoncus aenean vel elit scelerisque mauris pellentesque. Mauris cursus mattis molestie a iaculis at. Vel pharetra vel turpis nunc. Tristique magna sit amet purus. Scelerisque purus semper eget duis at tellus at urna. Netus et malesuada fames ac turpis egestas integer eget aliquet. Pellentesque elit ullamcorper dignissim cras tincidunt lobortis feugiat vivamus. Sagittis purus sit amet volutpat consequat. Lorem ipsum dolor sit amet consectetur.</Text>
            </View>
            <View style={styles.journalContainer}>
              <Text style={styles.chartText}>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Amet est placerat in egestas. Vestibulum mattis ullamcorper velit sed ullamcorper morbi. Ante in nibh mauris cursus. Neque gravida in fermentum et sollicitudin ac orci phasellus egestas. In hac habitasse platea dictumst quisque sagittis purus. Morbi tristique senectus et netus et malesuada fames ac. Eu sem integer vitae justo eget magna fermentum iaculis eu. Faucibus pulvinar elementum integer enim. Consequat ac felis donec et odio pellentesque diam volutpat.
                Venenatis tellus in metus vulputate. Amet tellus cras adipiscing enim eu turpis. Donec ultrices tincidunt arcu non. Mauris vitae ultricies leo integer malesuada. Egestas purus viverra accumsan in nisl. Massa placerat duis ultricies lacus sed turpis. Ac turpis egestas integer eget. Gravida neque convallis a cras semper auctor neque. Faucibus pulvinar elementum integer enim neque. Cursus risus at ultrices mi. Cras adipiscing enim eu turpis egestas pretium. Cras pulvinar mattis nunc sed. Urna neque viverra justo nec ultrices dui. Eget nunc lobortis mattis aliquam.</Text>
            </View>
            <View style={styles.journalContainer}>
              <Text style={styles.chartText}>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ac orci phasellus egestas tellus rutrum tellus pellentesque eu. Euismod lacinia at quis risus sed vulputate odio ut enim. Congue mauris rhoncus aenean vel elit scelerisque mauris pellentesque. Mauris cursus mattis molestie a iaculis at. Vel pharetra vel turpis nunc. Tristique magna sit amet purus. Scelerisque purus semper eget duis at tellus at urna. Netus et malesuada fames ac turpis egestas integer eget aliquet. Pellentesque elit ullamcorper dignissim cras tincidunt lobortis feugiat vivamus. Sagittis purus sit amet volutpat consequat. Lorem ipsum dolor sit amet consectetur.</Text>
            </View>

          </ScrollView>
        </SafeAreaView>
      </View>

      <View style={styles.addIcon}>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={{alignItems: 'center'}}>
          <MaterialCommunityIcons
            name="plus-circle"
            size={70}
            color={'#316FF6'}
          />
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <JournalEntryModalContent
          date={selectedDate}
          onClose={() => setModalVisible(false)}
        />
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 20,
  },
  selectedDateText: {
    fontSize: 18,
    paddingTop: 10,
    paddingBottom: 10,
    alignSelf: 'center',
  },
  flexRow: {
    justifyContent:'flex-start',
    flex: 1,
  },
  safeAreaContainer: {
  },
  scrollView: {
    marginHorizontal: 25,
    backgroundColor: 'white',
  },
  scrollViewContent: {
    paddingRight: 0,
  },
  journalContainer:{
    backgroundColor: 'white',
    width: '95%',
    alignSelf: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderColor:'black',
    borderWidth: 1,
    marginTop: 15,
    marginBottom:10,
    paddingTop: 10,
    paddingLeft: 10,
    paddingRight: 10,
    paddingBottom: 10,
  },
  dateTime: {
    alignItems: 'center',
    backgroundColor: 'black',
  },
  time: {
    fontSize: 30,
    color: 'white',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  addIcon: {
    alignItems: 'flex-end',
    paddingTop: 40,
    paddingBottom: 20,
    paddingRight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    left: 10,
    padding: 10,
    borderRadius: 20,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'black',
    textAlign: 'center',
    lineHeight: 21,
  },
});

export default CalendarComponent;
