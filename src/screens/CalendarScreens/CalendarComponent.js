import React, {useState, useEffect} from 'react';
import {SafeAreaView, StyleSheet, TouchableOpacity, View, Modal, Text} from 'react-native';
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
    paddingBottom: 75,
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
