import {CompoundingFrequency} from "./components/AdvancedSettings";
import React from "react";

export interface SimulationPoint {
    date: string;
    balance: number;
}

export interface Scenario {
    name: string;
    simulationData: SimulationPoint[];
    finalBalance: number;
    totalDeposited: number;
    interestGained: number;
    settings: {
        initialBalance: number;
        apy: number;
        startDate: string;
        targetDate: string;
        compoundingFrequency: CompoundingFrequency;
        goal: number;
        inflationRate: number,
        taxRate: number
    };
    deposits: Deposit[];
}

export interface Deposit {
    amount: number;
    date: Date;
    recurring: boolean;
    day: number;
}

export interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

export interface HelpModalProps {
    open: boolean;
    onClose: () => void;
}