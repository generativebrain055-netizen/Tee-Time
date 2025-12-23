import React from "react";
import PersonDetail from "./PersonDetail";

interface RosterProfileScreenProps {
    navigation: any;
    route: {
        params: {
            rosterId: string;
            person: {
                id: string;
                name: string;
                img?: string;
            };
        };
    };
}

export default function RosterProfileScreen({ navigation, route }: RosterProfileScreenProps) {
    const { person } = route.params;

    return (
        <PersonDetail
            person={person}
            onBack={() => navigation.goBack()}
            onRemoved={() => {
                // Optionally refresh the roster list
            }}
        />
    );
}
