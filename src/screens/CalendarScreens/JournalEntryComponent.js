import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {auth, db} from '../../../services/firebaseconfig.js';
import {collection, addDoc} from 'firebase/firestore';
import {format} from 'date-fns';

const Content = ({
  formattedDate,
  formattedTime,
  isCurrentDate,
  journalText,
  moodValue,
  handleInputChange,
  handleMoodSelection,
  handleSubmit,
  iconButtonStyles,
  iconStyles,
}) => (
  <>
    <View style={styles.dateContainer}>
      <Text style={styles.label}>Date: </Text>
      <Text style={styles.dateText}>
        {formattedDate} {isCurrentDate && '(Current Date)'}
      </Text>
    </View>
    <View style={styles.timeContainer}>
      <Text style={styles.label}>Time: </Text>
      <Text style={styles.dateText}>{formattedTime}</Text>
    </View>
    <TextInput
      style={styles.input}
      textAlignVertical="top"
      multiline
      value={journalText}
      placeholder="Write your journal entry here..."
      onChangeText={handleInputChange}
    />

    <View style={styles.feelingContainer}>
      <Text style={styles.feelingText}>Mood:</Text>
      <View style={styles.iconButtonContainer}>
        {[5, 4, 3, 2, 1].map(value => (
          <TouchableOpacity
            key={value}
            style={[styles.iconButton, iconButtonStyles(value)]}
            onPress={() => handleMoodSelection(value)}>
            <Text style={[styles.icon, iconStyles(value)]}>
              {value === 5
                ? '😍'
                : value === 4
                ? '😊'
                : value === 3
                ? '😐'
                : value === 2
                ? '☹️'
                : '😠'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>

    <TouchableOpacity
      style={[
        styles.submitButton,
        journalText.trim() === '' && styles.submitButtonDisabled,
      ]}
      onPress={handleSubmit}
      disabled={journalText.trim() === ''}>
      <Text style={styles.submitButtonText}>Submit</Text>
    </TouchableOpacity>
  </>
);

const JournalEntryScreen = ({route, navigation, onClose}) => {
  const {date} = route.params;

  const convertDateFormat = dateString => {
    const monthMap = {
      '01': 'January',
      '02': 'February',
      '03': 'March',
      '04': 'April',
      '05': 'May',
      '06': 'June',
      '07': 'July',
      '08': 'August',
      '09': 'September',
      '10': 'October',
      '11': 'November',
      '12': 'December',
    };

    const [year, month, day] = dateString.split('-');
    return `${monthMap[month]} ${day}, ${year}`;
  };

  const formattedDate = convertDateFormat(date);
  const currentDate = new Date();
  const isCurrentDate = format(currentDate, 'yyyy-MM-dd') === date;

  const [moodValue, setMoodValue] = useState(0);
  const [journalText, setJournalText] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Update current time when component mounts
    const interval = setInterval(() => {
      setCurrentTime(format(new Date(), 'hh:mm a'));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleMoodSelection = value => {
    setMoodValue(value);
  };

  const handleInputChange = text => {
    setJournalText(text);
  };

  const handleSubmit = async () => {
    if (moodValue === 0) {
      Alert.alert('Error', 'Mood entry must be selected');
      return;
    }

    if (!currentUser) {
      Alert.alert('Error', 'User information not available');
      return;
    }

    console.log('Submitted text:', journalText);
    console.log('Mood Value:', moodValue);
    console.log('Date:', date);
    console.log('Time:', currentTime);

    try {
      const entryRef = collection(db, 'Entries');
      await addDoc(entryRef, {
        userEmail: currentUser.email,
        date: date,
        time: currentTime,
        moodValue: moodValue,
        journal: journalText,
      });

      Alert.alert('Success', 'Journal Entry and Mood Saved!');
      onClose();
    } catch (error) {
      console.error('Error adding document:', error);
    }
  };

  const moodColors = ['#FF6347', '#FFA500', 'yellow', '#1da118', '#c33cf0'];

  const iconButtonStyles = value => ({
    padding: 12,
    borderRadius: 25,
    marginHorizontal: 7,
    borderWidth: 1,
    backgroundColor: moodValue === value ? moodColors[value - 1] : 'white',
  });

  const iconStyles = value => ({
    alignSelf: 'center',
    fontSize: 24,
    color: moodValue === value ? '#333' : 'black',
  });

  return (
    <>
      {Platform.OS === 'android' ? (
        <KeyboardAvoidingView style={styles.container} behavior="height">
          <Content
            formattedDate={formattedDate}
            formattedTime={currentTime}
            isCurrentDate={isCurrentDate}
            journalText={journalText}
            moodValue={moodValue}
            handleInputChange={handleInputChange}
            handleMoodSelection={handleMoodSelection}
            handleSubmit={handleSubmit}
            iconButtonStyles={iconButtonStyles}
            iconStyles={iconStyles}
          />
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.container}>
          <Content
            formattedDate={formattedDate}
            formattedTime={currentTime}
            isCurrentDate={isCurrentDate}
            journalText={journalText}
            moodValue={moodValue}
            handleInputChange={handleInputChange}
            handleMoodSelection={handleMoodSelection}
            handleSubmit={handleSubmit}
            iconButtonStyles={iconButtonStyles}
            iconStyles={iconStyles}
          />
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
    padding: 16,
    marginTop: 40,
    backgroundColor: 'white',
  },
  label: {
    fontWeight: 'bold',
    fontSize: 20,
    color: 'black',
  },
  dateText: {
    fontSize: 20,
    color: 'black',
  },
  input: {
    borderColor: 'gray',
    width: '100%',
    height: '50%',
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    margin: 12,
    elevation: 5,
    backgroundColor: 'white',
  },
  iconButton: {
    padding: 12,
    borderRadius: 25,
    marginHorizontal: 7,
    borderWidth: 1,
    borderColor: 'black',
  },
  icon: {
    alignSelf: 'center',
    fontSize: 24,
  },
  dateContainer: {
    paddingTop: 60,
    paddingLeft: 5,
    flexDirection: 'row',
    alignSelf: 'flex-start',
  },
  timeContainer: {
    paddingTop: 10,
    paddingLeft: 5,
    flexDirection: 'row',
    alignSelf: 'flex-start',
  },
  feelingContainer: {
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  feelingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#784888',
    paddingLeft: 5,
  },
  iconButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#316FF6',
    width: '100%',
    padding: 12,
    borderRadius: 10,
    marginTop: 20,
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#a3a3a3',
  },
  submitButtonText: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 15,
    color: 'white',
  },
});

export default JournalEntryScreen;
