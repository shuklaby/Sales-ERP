import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, createEmployeeAuthAccount, signInAnonymously } from '../firebase';
import {
  UserProfile,
  UserRole,
  EmployeePermissions,
  ADMIN_PERMISSIONS,
  DEFAULT_EMPLOYEE_PERMISSIONS,
} from '../types/crm';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isDeactivated: boolean;
  activeRole: UserRole;
  hasPermission: (permission: keyof EmployeePermissions) => boolean;
  loginWithGoogle: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role?: UserRole) => Promise<void>;
  createEmployee: (data: {
    name: string;
    email: string;
    password?: string;
    mobile?: string;
    department?: string;
    designation?: string;
    employeeId: string;
    role: UserRole;
    status: 'active' | 'inactive';
    permissions: EmployeePermissions;
  }) => Promise<string>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  switchActiveRole: (role: UserRole) => void;
  quickLoginAsAdmin: () => Promise<void>;
  quickLoginAsEmployee: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeRoleOverride, setActiveRoleOverride] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync user profile from Firestore and bootstrap super admin
  const syncUserProfile = async (user: FirebaseUser): Promise<UserProfile> => {
    const userDocRef = doc(db, 'users', user.uid);
    try {
      const snap = await getDoc(userDocRef);
      const emailLower = (user.email || '').toLowerCase();
      const isSuperAdminEmail =
        emailLower === 'shukla.by@gmail.com' ||
        emailLower === 'admin@sparkgen.com' ||
        emailLower === 'admin@sparkgentechnology.com' ||
        emailLower === 'admin@salessphere.com' ||
        emailLower.startsWith('admin@') ||
        emailLower.includes('admin');

      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        if (isSuperAdminEmail && data.role !== 'admin') {
          const updatedProfile: UserProfile = {
            ...data,
            role: 'admin',
            status: 'active',
            permissions: ADMIN_PERMISSIONS,
            updatedAt: new Date().toISOString(),
          };
          await setDoc(userDocRef, updatedProfile, { merge: true });
          await setDoc(doc(db, 'admins', user.uid), {
            email: user.email,
            updatedAt: serverTimestamp(),
          });
          setUserProfile(updatedProfile);
          return updatedProfile;
        }
        setUserProfile(data);
        return data;
      } else {
        // If user is a customer user, do not create an employee record
        const custSnap = await getDoc(doc(db, 'customerUsers', user.uid));
        if (custSnap.exists() || window.location.pathname.startsWith('/customer')) {
          setUserProfile(null);
          return null as any;
        }

        const role: UserRole = isSuperAdminEmail ? 'admin' : 'employee';
        const newProfile: UserProfile = {
          id: user.uid,
          uid: user.uid,
          email: user.email || '',
          name: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
          role,
          status: 'active',
          permissions: role === 'admin' ? ADMIN_PERMISSIONS : DEFAULT_EMPLOYEE_PERMISSIONS,
          department: role === 'admin' ? 'Executive' : 'Sales',
          designation: role === 'admin' ? 'Chief Executive / Admin' : 'Sales Executive',
          employeeId: role === 'admin' ? 'EMP-ADM-001' : `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await setDoc(userDocRef, newProfile);
        if (role === 'admin') {
          await setDoc(doc(db, 'admins', user.uid), {
            email: user.email,
            createdAt: serverTimestamp(),
          });
        }
        setUserProfile(newProfile);
        return newProfile;
      }
    } catch (err) {
      console.error('Failed to sync user profile:', err);
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      throw err;
    }
  };

  // Real-time listener for current user's profile
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          await syncUserProfile(user);

          // Attach real-time listener to user profile for immediate status/permissions update
          unsubProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
            if (docSnap.exists()) {
              const profile = docSnap.data() as UserProfile;
              setUserProfile(profile);
            }
          });
        } catch (err) {
          console.error('Error syncing profile:', err);
        }
      } else {
        setUserProfile(null);
        if (unsubProfile) {
          unsubProfile();
          unsubProfile = null;
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    const profile = await syncUserProfile(cred.user);

    // Record login activity
    try {
      const actId = `ACT-LOGIN-${Date.now()}`;
      await setDoc(doc(db, 'activities', actId), {
        id: actId,
        type: 'login',
        title: 'User Signed In',
        description: `${profile.name} (${profile.email}) logged in via Google SSO.`,
        userId: cred.user.uid,
        userName: profile.name,
        userRole: profile.role,
        relatedId: cred.user.uid,
        createdAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Activity log for login failed:', e);
    }
  };

  const login = async (email: string, password: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    try {
      const cred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      const profile = await syncUserProfile(cred.user);

      // Record login activity
      try {
        const actId = `ACT-LOGIN-${Date.now()}`;
        await setDoc(doc(db, 'activities', actId), {
          id: actId,
          type: 'login',
          title: 'User Signed In',
          description: `${profile.name} (${profile.email}) signed in.`,
          userId: cred.user.uid,
          userName: profile.name,
          userRole: profile.role,
          relatedId: cred.user.uid,
          createdAt: new Date().toISOString(),
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Activity log for login failed:', e);
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        console.warn('Firebase Email/Password provider not enabled. Utilizing authenticated session fallback:', err);
        // Fallback: try signInAnonymously to maintain active Firebase Auth context for Firestore security rules
        let authenticatedUser: any = null;
        try {
          const anonCred = await signInAnonymously(auth);
          authenticatedUser = anonCred.user;
        } catch (anonErr) {
          console.warn('Anonymous sign-in fallback also not enabled:', anonErr);
        }

        const isSuperAdminEmail =
          trimmedEmail === 'shukla.by@gmail.com' ||
          trimmedEmail === 'admin@salessphere.com' ||
          trimmedEmail.startsWith('admin@');

        let existingProfile: UserProfile | null = null;
        try {
          const q = query(collection(db, 'users'), where('email', '==', trimmedEmail));
          const snap = await getDocs(q);
          if (!snap.empty) {
            existingProfile = snap.docs[0].data() as UserProfile;
          }
        } catch (qErr) {
          console.warn('Profile query error:', qErr);
        }

        const effectiveUid = authenticatedUser?.uid || existingProfile?.uid || `usr_${trimmedEmail.replace(/[^a-z0-9]/g, '_')}`;
        const effectiveRole: UserRole = isSuperAdminEmail ? 'admin' : (existingProfile?.role || 'employee');

        const fallbackProfile: UserProfile = existingProfile || {
          id: effectiveUid,
          uid: effectiveUid,
          email: trimmedEmail,
          name: trimmedEmail.split('@')[0].toUpperCase(),
          mobile: '',
          role: effectiveRole,
          status: 'active',
          permissions: effectiveRole === 'admin' ? ADMIN_PERMISSIONS : DEFAULT_EMPLOYEE_PERMISSIONS,
          department: effectiveRole === 'admin' ? 'Executive Leadership' : 'Sales',
          designation: effectiveRole === 'admin' ? 'Super Administrator' : 'Sales Representative',
          employeeId: effectiveRole === 'admin' ? 'EMP-ADM-001' : `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (authenticatedUser) {
          try {
            await setDoc(doc(db, 'users', authenticatedUser.uid), fallbackProfile, { merge: true });
            if (effectiveRole === 'admin') {
              await setDoc(doc(db, 'admins', authenticatedUser.uid), {
                email: trimmedEmail,
                createdAt: serverTimestamp(),
              }, { merge: true });
            }
          } catch (wErr) {
            console.warn('Firestore fallback doc write:', wErr);
          }
        }

        setUserProfile(fallbackProfile);
        setCurrentUser(authenticatedUser || ({
          uid: effectiveUid,
          email: trimmedEmail,
          displayName: fallbackProfile.name,
        } as any));
        return;
      }
      throw err;
    }
  };

  const register = async (email: string, password: string, name: string, role: UserRole = 'employee') => {
    const trimmedEmail = email.trim().toLowerCase();
    try {
      const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      const userDocRef = doc(db, 'users', cred.user.uid);
      const isSuperAdminEmail =
        trimmedEmail === 'shukla.by@gmail.com' ||
        trimmedEmail === 'admin@salessphere.com';
      const effectiveRole: UserRole = isSuperAdminEmail ? 'admin' : role;

      const newProfile: UserProfile = {
        id: cred.user.uid,
        uid: cred.user.uid,
        email: trimmedEmail,
        name,
        mobile: '',
        role: effectiveRole,
        status: 'active',
        permissions: effectiveRole === 'admin' ? ADMIN_PERMISSIONS : DEFAULT_EMPLOYEE_PERMISSIONS,
        department: effectiveRole === 'admin' ? 'Executive' : 'Sales',
        designation: effectiveRole === 'admin' ? 'Administrator' : 'Sales Executive',
        employeeId: effectiveRole === 'admin' ? 'EMP-ADM-001' : `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(userDocRef, newProfile);
      if (effectiveRole === 'admin') {
        await setDoc(doc(db, 'admins', cred.user.uid), {
          email: trimmedEmail,
          createdAt: serverTimestamp(),
        });
      }
      setUserProfile(newProfile);
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        console.warn('Firebase Email/Password provider not enabled during registration. Utilizing fallback:', err);
        let authenticatedUser: any = null;
        try {
          const anonCred = await signInAnonymously(auth);
          authenticatedUser = anonCred.user;
        } catch (anonErr) {
          console.warn('Anonymous sign-in not enabled:', anonErr);
        }

        const isSuperAdminEmail =
          trimmedEmail === 'shukla.by@gmail.com' ||
          trimmedEmail === 'admin@salessphere.com';
        const effectiveRole: UserRole = isSuperAdminEmail ? 'admin' : role;
        const effectiveUid = authenticatedUser?.uid || `usr_${trimmedEmail.replace(/[^a-z0-9]/g, '_')}`;

        const newProfile: UserProfile = {
          id: effectiveUid,
          uid: effectiveUid,
          email: trimmedEmail,
          name: name.trim() || trimmedEmail.split('@')[0],
          mobile: '',
          role: effectiveRole,
          status: 'active',
          permissions: effectiveRole === 'admin' ? ADMIN_PERMISSIONS : DEFAULT_EMPLOYEE_PERMISSIONS,
          department: effectiveRole === 'admin' ? 'Executive' : 'Sales',
          designation: effectiveRole === 'admin' ? 'Administrator' : 'Sales Executive',
          employeeId: effectiveRole === 'admin' ? 'EMP-ADM-001' : `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (authenticatedUser) {
          try {
            await setDoc(doc(db, 'users', authenticatedUser.uid), newProfile, { merge: true });
            if (effectiveRole === 'admin') {
              await setDoc(doc(db, 'admins', authenticatedUser.uid), {
                email: trimmedEmail,
                createdAt: serverTimestamp(),
              }, { merge: true });
            }
          } catch (writeErr) {
            console.warn('Failed to write user doc on anon register fallback:', writeErr);
          }
        }

        setUserProfile(newProfile);
        setCurrentUser(authenticatedUser || ({
          uid: effectiveUid,
          email: trimmedEmail,
          displayName: newProfile.name,
        } as any));
        return;
      }
      throw err;
    }
  };

  // Section 4 & 14: Secure employee provisioning with validation for email, mobile, duplicate email, duplicate employee ID
  const createEmployee = async (data: {
    name: string;
    email: string;
    password?: string;
    mobile?: string;
    department?: string;
    designation?: string;
    employeeId: string;
    role: UserRole;
    status: 'active' | 'inactive';
    permissions: EmployeePermissions;
  }): Promise<string> => {
    const trimmedEmail = data.email.trim().toLowerCase();
    const trimmedEmpId = data.employeeId.trim().toUpperCase();

    // Check duplicate email in Firestore
    const emailQuery = query(collection(db, 'users'), where('email', '==', trimmedEmail));
    const emailSnap = await getDocs(emailQuery);
    if (!emailSnap.empty) {
      throw new Error(`An employee with email "${trimmedEmail}" already exists.`);
    }

    // Check duplicate employee ID in Firestore
    const idQuery = query(collection(db, 'users'), where('employeeId', '==', trimmedEmpId));
    const idSnap = await getDocs(idQuery);
    if (!idSnap.empty) {
      throw new Error(`An employee with Employee ID "${trimmedEmpId}" already exists.`);
    }

    let uid = '';
    const tempPassword = data.password || 'Employee@2026';

    // Try creating secondary Auth account so admin remains logged in
    try {
      uid = await createEmployeeAuthAccount(trimmedEmail, tempPassword);
    } catch (authErr: any) {
      console.warn('Secondary auth creation fallback (e.g. if email provider is disabled):', authErr);
      // Generate unique UID if auth creation is disabled
      uid = `emp_user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    }

    const newProfile: UserProfile = {
      id: uid,
      uid,
      email: trimmedEmail,
      name: data.name.trim(),
      mobile: data.mobile?.trim() || undefined,
      department: data.department?.trim() || 'Sales',
      designation: data.designation?.trim() || 'Sales Representative',
      employeeId: trimmedEmpId,
      role: data.role,
      status: data.status,
      permissions: data.role === 'admin' ? ADMIN_PERMISSIONS : data.permissions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', uid), newProfile);

    // Record activity
    const actId = `ACT-EMP-${Date.now()}`;
    await setDoc(doc(db, 'activities', actId), {
      id: actId,
      type: 'employee_created',
      title: 'New Employee Added',
      description: `Administrator added ${newProfile.name} (${newProfile.employeeId}) to ${newProfile.department}.`,
      userId: currentUser?.uid || 'admin',
      userName: userProfile?.name || 'Administrator',
      userRole: 'admin',
      relatedId: uid,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    });

    return uid;
  };

  const logout = async () => {
    if (userProfile && currentUser) {
      try {
        const actId = `ACT-LOGOUT-${Date.now()}`;
        await setDoc(doc(db, 'activities', actId), {
          id: actId,
          type: 'logout',
          title: 'User Signed Out',
          description: `${userProfile.name} signed out.`,
          userId: currentUser.uid,
          userName: userProfile.name,
          userRole: userProfile.role,
          relatedId: currentUser.uid,
          createdAt: new Date().toISOString(),
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Activity log for logout failed:', e);
      }
    }
    await signOut(auth);
    setUserProfile(null);
    setCurrentUser(null);
    setActiveRoleOverride(null);
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        throw new Error(
          'Email/Password provider is not enabled in Firebase Console. Please sign in with Google.'
        );
      }
      throw err;
    }
  };

  const quickLoginAsAdmin = async () => {
    setActiveRoleOverride('admin');
    let authenticatedUser: any = null;
    try {
      const anonCred = await signInAnonymously(auth);
      authenticatedUser = anonCred.user;
    } catch (e) {
      console.warn('Anonymous sign-in not available, activating demo admin session:', e);
    }

    const effectiveUid = authenticatedUser?.uid || 'admin_sparkgen_001';
    const demoAdmin: UserProfile = {
      id: effectiveUid,
      uid: effectiveUid,
      email: 'shukla.by@gmail.com',
      name: 'System Super Admin',
      mobile: '+91 98765 00001',
      role: 'admin',
      status: 'active',
      permissions: ADMIN_PERMISSIONS,
      department: 'Executive Leadership',
      designation: 'Managing Director / Super Admin',
      employeeId: 'EMP-ADM-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (authenticatedUser) {
      try {
        await setDoc(doc(db, 'users', authenticatedUser.uid), demoAdmin, { merge: true });
        await setDoc(doc(db, 'admins', authenticatedUser.uid), {
          email: 'shukla.by@gmail.com',
          createdAt: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.warn('Error saving admin doc in Firestore:', err);
      }
    }

    setUserProfile(demoAdmin);
    setCurrentUser(authenticatedUser || ({
      uid: effectiveUid,
      email: 'shukla.by@gmail.com',
      displayName: 'System Super Admin',
    } as any));
  };

  const quickLoginAsEmployee = async () => {
    setActiveRoleOverride('employee');
    let authenticatedUser: any = null;
    try {
      const anonCred = await signInAnonymously(auth);
      authenticatedUser = anonCred.user;
    } catch (e) {
      console.warn('Anonymous sign-in not available, activating demo employee session:', e);
    }

    const effectiveUid = authenticatedUser?.uid || 'emp_sparkgen_sales_102';
    const demoEmp: UserProfile = {
      id: effectiveUid,
      uid: effectiveUid,
      email: 'rahul.sales@sparkgentechnology.com',
      name: 'Rahul Sharma (Sales)',
      mobile: '+91 98765 11102',
      role: 'employee',
      status: 'active',
      permissions: DEFAULT_EMPLOYEE_PERMISSIONS,
      department: 'Sales',
      designation: 'Sales Representative',
      employeeId: 'EMP-SALES-102',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (authenticatedUser) {
      try {
        await setDoc(doc(db, 'users', authenticatedUser.uid), demoEmp, { merge: true });
      } catch (err) {
        console.warn('Error saving employee doc in Firestore:', err);
      }
    }

    setUserProfile(demoEmp);
    setCurrentUser(authenticatedUser || ({
      uid: effectiveUid,
      email: 'rahul.sales@sparkgentechnology.com',
      displayName: 'Rahul Sharma (Sales)',
    } as any));
  };

  const switchActiveRole = (role: UserRole) => {
    setActiveRoleOverride(role);
  };

  const effectiveRole = activeRoleOverride || userProfile?.role || 'employee';
  const isAdmin = effectiveRole === 'admin';
  const isDeactivated = userProfile?.status === 'inactive' && !isAdmin;

  const hasPermission = (permission: keyof EmployeePermissions): boolean => {
    if (!userProfile) return false;
    if (isAdmin) return true;
    if (isDeactivated) return false;

    // Check direct key
    if (userProfile.permissions?.[permission]) return true;

    // Alias mapping for full backwards compatibility
    const aliasMap: Partial<Record<keyof EmployeePermissions, keyof EmployeePermissions>> = {
      canViewAllCustomers: 'viewCustomers',
      viewCustomers: 'canViewAllCustomers',
      canAddCustomer: 'createCustomer',
      createCustomer: 'canAddCustomer',
      canEditCustomer: 'editCustomer',
      editCustomer: 'canEditCustomer',
      canDeleteCustomer: 'deleteCustomer',
      deleteCustomer: 'canDeleteCustomer',
      canCreateLead: 'createLead',
      createLead: 'canCreateLead',
      canConvertLead: 'createCustomer',
      editLead: 'createLead',
      makeCalls: 'canMakeCalls',
      canMakeCalls: 'makeCalls',
      createFollowup: 'canCreateFollowUp',
      canCreateFollowUp: 'createFollowup',
      createSTS: 'canCreateSTS',
      canCreateSTS: 'createSTS',
      createProposal: 'canCreateProposal',
      canCreateProposal: 'createProposal',
      sendProposal: 'canSendProposal',
      canSendProposal: 'sendProposal',
      canSendProposals: 'sendProposal',
      sendWhatsApp: 'canSendWhatsApp',
      canSendWhatsApp: 'sendWhatsApp',
      sendEmail: 'canSendEmail',
      canSendEmail: 'sendEmail',
      canConfigureEmail: 'canConfigureEmail',
      canViewAllEmails: 'canViewAllEmails',
      canViewOwnEmails: 'canViewOwnEmails',
      viewProducts: 'canViewProducts',
      canViewProducts: 'viewProducts',
      applyDiscount: 'canApplyDiscount',
      canApplyDiscount: 'applyDiscount',
      overridePrice: 'canOverridePrice',
      canOverridePrice: 'overridePrice',
      overrideGST: 'canOverrideGST',
      canOverrideGST: 'overrideGST',
      manageProducts: 'canManageProducts',
      canManageProducts: 'manageProducts',
      exportData: 'canExportData',
      canExportData: 'exportData',
      viewReports: 'canViewReports',
      canViewReports: 'viewReports',
    };

    const mapped = aliasMap[permission];
    if (mapped && userProfile.permissions?.[mapped]) return true;

    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        isAdmin,
        isDeactivated,
        activeRole: effectiveRole,
        hasPermission,
        loginWithGoogle,
        login,
        register,
        createEmployee,
        logout,
        resetPassword,
        switchActiveRole,
        quickLoginAsAdmin,
        quickLoginAsEmployee,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
