import React, {useState, useEffect} from 'react';
import {SafeAreaView, StyleSheet, TouchableOpacity, View, Modal, Text, ScrollView, StatusBar} from 'react-native';
import {Calendar} from 'react-native-calendars';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import JournalEntryScreen from './JournalEntryComponent.js';
import {todayISO} from '../../utils/dates';
import BackgroundImage from '../../assets/Backgroundimage';
import {listJournalEntries} from '../../../services/data/dataService';

// Defined at module level: a component declared inside render would remount the editor on every parent update.
const JournalEntryModalContent = ({date, onClose}) => (
  <View style={styles.modalContainer}>
    <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityLabel="Close">
      <MaterialCommunityIcons name="close-circle-outline" size={50} color="#F2F3FF" />
    </TouchableOpacity>
    <JournalEntryScreen route={{params: {date}}} onClose={onClose} />
  </View>
);

const CalendarComponent = () => {
  const [selectedDate, setSelectedDate] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [minDate, setMinDate] = useState('');
  const [journalEntries, setJournalEntries] = useState([]);

  const loadJournalEntries = async () => {
    try {
      const entries = await listJournalEntries();
      setJournalEntries(entries);
    } catch (error) {
      console.error('Error loading local journal entries:', error);
    }
  };

  useEffect(() => {
    const today = todayISO();
    setSelectedDate(today);
    setMinDate(today);
    loadJournalEntries();
  }, []);

  useEffect(() => {
    loadJournalEntries();
  }, [selectedDate]);

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

  const selectedEntries = journalEntries.filter(entry => entry.date === selectedDate);

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
            {selectedEntries.length === 0 ? (
              <View style={styles.journalContainer}>
                <Text style={styles.chartText}>No journal entries for this date.</Text>
              </View>
            ) : selectedEntries.map(entry => (
              <View key={entry.id} style={styles.journalContainer}>
                <Text style={styles.entryTime}>{entry.time} | Mood: {entry.moodValue}/5</Text>
                <Text style={styles.chartText}>{entry.journal}</Text>
              </View>
            ))}

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
          onClose={() => {
            setModalVisible(false);
            loadJournalEntries();
          }}
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
  entryTime: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: 'black',
  },
  chartText: {
    color: 'black',
    fontSize: 16,
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
    backgroundColor: '#07091A',
    paddingTop: 70,
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
