import React, { createContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export interface UserData {
    role: 'admin' | 'manager' | 'cashier';
    shopId: string;
    isActive: boolean;
    displayName: string;
    email: string;
}

interface AuthContextType {
    user: User | null;
    userData: UserData | null;
    loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async firebaseUser => {
            setUser(firebaseUser);
            if (firebaseUser) {
                // Fetch custom user data from Firestore
                try {
                    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                    if (userDoc.exists()) {
                        setUserData(userDoc.data() as UserData);
                    } else {
                        // If no user document exists, create default userData using UID as shopId
                        setUserData({
                            role: 'admin',
                            shopId: firebaseUser.uid, // Use UID as shopId
                            isActive: true,
                            displayName: firebaseUser.displayName || firebaseUser.email || 'User',
                            email: firebaseUser.email || '',
                        });
                    }
                } catch (e) {
                    // Expected: Firestore security rules may block access to users collection
                    // Fallback to default userData using UID as shopId
                    setUserData({
                        role: 'admin',
                        shopId: firebaseUser.uid,
                        isActive: true,
                        displayName: firebaseUser.displayName || firebaseUser.email || 'User',
                        email: firebaseUser.email || '',
                    });
                }
            } else {
                setUserData(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return <AuthContext.Provider value={{ user, userData, loading }}>{!loading && children}</AuthContext.Provider>;
};
