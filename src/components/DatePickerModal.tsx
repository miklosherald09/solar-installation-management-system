import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

interface DatePickerModalProps {
  visible: boolean;
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;

  title?: string;
  minimumDate?: Date;
  maximumDate?: Date;

  cancelText?: string;
  doneText?: string;
}

const DatePickerModal = ({
  visible,
  value,
  onChange,
  onClose,
  title = 'Select Date',
  minimumDate,
  maximumDate,
  cancelText = 'Cancel',
  doneText = 'Done',
}: DatePickerModalProps) => {
  const [tempDate, setTempDate] = useState(value);

  useEffect(() => {
    if (visible) {
      setTempDate(value);
    }
  }, [visible, value]);

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const handleChangeAndroid = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  const handleDone = () => {
    onChange(tempDate);
    onClose();
  };

  const handleCancel = () => {
    setTempDate(value);
    onClose();
  };

  if (Platform.OS === 'android') {
    return (
      <>
        {visible ? (
          <DateTimePicker
            value={tempDate}
            mode="date"
            display={'default'}
            onChange={handleChangeAndroid}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            style={styles.datePicker}
          />
        ) : null}
      </>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{title}</Text>

          <DateTimePicker
            value={tempDate}
            mode="date"
            display={'spinner'}
            onChange={handleChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            themeVariant="light"
            style={styles.datePicker}
          />

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
            >
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
              <Text style={styles.doneText}>{doneText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default DatePickerModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modal: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 15,
    alignItems: 'center',
  },

  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111',
    marginBottom: 10,
  },

  datePicker: {
    width: 320,
    height: 180,
  },

  buttons: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },

  cancelButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
  },

  doneButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },

  cancelText: {
    fontSize: 16,
    color: '#333',
  },

  doneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
