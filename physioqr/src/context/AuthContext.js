import React, { createContext, useContext, useState } from "react";
import { MOCK_DOCTORS } from "../mockData/doctorsData";
import { MOCK_AGENTS } from "../mockData/agentsData";
import { MOCK_PATIENTS } from "../mockData/patientsData";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Roles: 'admin' | 'agent' | 'doctor' | 'patient'
  const [currentRole, setCurrentRole] = useState("admin");

  // Selected entities for role simulation
  const [selectedDoctor, setSelectedDoctor] = useState(MOCK_DOCTORS[0]);
  const [selectedAgent, setSelectedAgent] = useState(MOCK_AGENTS[0]);
  const [selectedPatient, setSelectedPatient] = useState(MOCK_PATIENTS[0]);

  const switchRole = (newRole) => {
    setCurrentRole(newRole);
  };

  return (
    <AuthContext.Provider
      value={{
        currentRole,
        switchRole,
        selectedDoctor,
        setSelectedDoctor,
        selectedAgent,
        setSelectedAgent,
        selectedPatient,
        setSelectedPatient,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
