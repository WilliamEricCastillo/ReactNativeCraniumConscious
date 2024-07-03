import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    auth,
    onAuthStateChanged,
    signOut,
} from '../../services/firebaseconfig';
import Ionicons from '@expo/vector-icons/Ionicons';
import BackgroundImage from '../assets/Backgroundimage';

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [user, setUser] = useState(null);
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
        });

        return () => unsubscribe();
    }, []);

    const handleAuthentication = async () => {
        try {
            if (user) {
                console.log('User logged out successfully!');
                await signOut(auth);
            } else {
                if (isLogin) {
                    await signInWithEmailAndPassword(auth, email, password);
                    console.log('User signed in successfully!');
                } else {
                    // Check if passwords match
                    if (password !== confirmPassword) {
                        Alert.alert('Passwords do not match.');
                        return;
                    }

                    await createUserWithEmailAndPassword(auth, email, password);
                    console.log('User created successfully!');
                }
            }
        } catch (error) {
            console.error('Authentication error:', error.message);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const toggleLogin = () => {
        setIsLogin(!isLogin);
    };

    return (
        <>
            <BackgroundImage />
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : null}>
                <ScrollView contentContainerStyle={styles.scrollViewContent}>
                    <View style={styles.innerContainer}>
                        <Image
                            source={require('../assets/mind.png')}
                            style={styles.logo}
                        />
                        <Text style={styles.appName}>Cranium Conscious</Text>
                        <View style={styles.loginContainer}>
                            <Text style={styles.title}>
                                {isLogin ? 'Login' : 'Sign Up'}
                            </Text>
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="Email"
                                autoCapitalize="none"
                            />
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={styles.passwordInput}
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="Password"
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity
                                    onPress={togglePasswordVisibility}
                                    style={styles.toggleButton}>
                                    <Ionicons
                                        name={showPassword ? 'eye' : 'eye-off'}
                                        size={24}
                                        color="black"
                                    />
                                </TouchableOpacity>
                            </View>
                            {!isLogin && (
                                <TextInput
                                    style={styles.input}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="Confirm Password"
                                    secureTextEntry={!showPassword}
                                />
                            )}
                            <TouchableOpacity
                                onPress={handleAuthentication}
                                style={styles.button}>
                                <Text style={styles.buttonText}>
                                    {isLogin ? 'Sign In' : 'Sign Up'}
                                </Text>
                            </TouchableOpacity>

                            <View style={styles.bottomContainer}>
                                <Text
                                    style={styles.toggleText}
                                    onPress={toggleLogin}>
                                    {isLogin
                                        ? 'Need an account? Sign Up'
                                        : 'Already have an account? Sign In'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingBottom: 100,
    },
    logo: {
        height: 150,
        width: 250,
        alignSelf: 'center',
        justifyContent: 'center',
        marginTop: 50,
    },
    appName: {
        fontWeight: 'bold',
        fontSize: 33,
        color: 'black',
        fontFamily: 'TimesNewRoman',
        paddingBottom: 10,
        paddingTop: 8,
        textShadowColor: 'white',
        textShadowOffset: { width: -1, height: -1 },
        textShadowRadius: 5,
    },
    innerContainer: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollViewContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    loginContainer: {
        width: '90%',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
    },
    title: {
        fontSize: 18,
        marginBottom: 16,
        textAlign: 'center',
    },
    input: {
        width: '100%',
        height: 50,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        paddingHorizontal: 20,
        marginBottom: 20,
        backgroundColor: '#fff',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    button: {
        backgroundColor: '#007bff',
        width: '100%',
        height: 50,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 10,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    passwordInput: {
        flex: 1,
        height: 50,
        paddingHorizontal: 20,
    },
    toggleButton: {
        padding: 15,
    },
    toggleText: {
        color: '#007bff',
        textAlign: 'center',
        fontSize: 16,
    },
    bottomContainer: {
        marginTop: 20,
    },
});

export default LoginScreen;
