import React from "react";
import PersonDetail from "./PersonDetail";

interface RosterProfileScreenProps {
    navigation: any;
    route: {
        params: {
            rosterId?: string;
            person: {
                id: string;
                name: string;
                img?: string;
            };
        };
    };
}

export default function RosterProfileScreen({ navigation, route }: RosterProfileScreenProps) {
    const { person, rosterId } = route.params;
    const personWithRosterId = {
        ...person,
        id: rosterId ?? person.id,
    };
    const handleBack = () => {
        if (typeof navigation?.canGoBack === "function" && navigation.canGoBack()) {
            navigation.goBack();
            return;
        }
        navigation?.navigate("Home");
    };

    return (
        <PersonDetail
            person={personWithRosterId}
            navigation={navigation}
            onBack={handleBack}
            onRemoved={() => {
                // Optionally refresh the roster list
            }}
        />
    );
}
