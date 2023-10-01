import React, { createContext, useContext, useEffect, useState } from 'react';

import {
    BrowserRouter as Router,
    Route,
    Routes,
    useNavigate,
} from 'react-router-dom';

import { select } from 'd3-selection';
import NovemViewPlot from './components/NovemViewPlot';
import NovemViewMail from './components/NovemViewMail';
import NovemViewProfile from './components/NovemViewProfile';

export const ViewDataContext = createContext<{
    visId?: string;
    uri?: string;
    shortname?: string;
    route?: string;
    token?: string;
    apiRoot?: string;
    ignoreSslWarn?: boolean;
}>({
    visId: '',
    uri: '',
    shortname: '',
    route: '',
    token: '',
    apiRoot: '',
    ignoreSslWarn: false,
});

interface Creator {
    username: string;
    name: string;
    avatar: string;
}

interface About {
    shortname: string;
    name: string;
    created: string;
    uri_vis: string;
    uri_img: string;
    uri_pdf: string;
    vis_type: string;
    description: string;
    summary: string;
}

interface Recipient {
    id: string;
    name: string;
    path: string;
}

interface RecipientEntry {
    recipient: Recipient;
    type: string; // if there's a limited set of possible strings, use union type instead, e.g., type: "user" | "admin" | ...;
}

interface Recipients {
    cc: RecipientEntry[] | null;
    to: RecipientEntry[] | null;
}

interface FetchedData {
    data: any[];
    metadata: Record<string, unknown>;
    config: Record<string, unknown>;
    creator: Creator;
    references: any;
    about: About;
    recipients: Recipients;
}

export const enforceStyles = () => {
    const isDark = select('body').classed('vscode-dark');

    localStorage.setItem('theme', isDark ? 'dark' : 'light');

    const iframes = document.getElementsByTagName('iframe');
    for (const iframe of iframes) {
        let elem = iframe.contentDocument?.documentElement;
        try {
            if (isDark) {
                elem?.setAttribute('data-dark-mode', '');
            } else {
                elem?.removeAttribute('data-dark-mode');
            }
        } catch (e) {}
    }
};

export const FetchedDataContext = createContext<FetchedData | null>(null);

const MainContent = () => {
    const navigate = useNavigate();
    const [viewData, setViewData] = useState({
        visId: undefined,
        uri: undefined,
        shortname: undefined,
        route: undefined,
        token: undefined,
        apiRoot: undefined,
        ignoreSslWarn: undefined,
    });

    const { visId, uri, shortname, route, token, apiRoot, ignoreSslWarn } =
        viewData;
    const [fetchedData, setFetchedData] = useState<FetchedData | null>(null);

    useEffect(() => {
        // Define the callback for the observer

        // Define the callback for the observer
        const callback = (
            mutationsList: MutationRecord[],
            observer: MutationObserver,
        ) => {
            for (let mutation of mutationsList) {
                if (
                    mutation.type === 'attributes' &&
                    mutation.attributeName === 'class'
                ) {
                    enforceStyles();
                }
            }
        };

        // Create an observer instance with the callback
        const observer = new MutationObserver(callback);

        // Start observing the body with the configured parameters
        observer.observe(document.body, { attributes: true });

        // Cleanup: disconnect the observer when the component is unmounted
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;

            switch (message.command) {
                case 'navigate':
                    setViewData({
                        route: message.route,
                        visId: message.visId,
                        uri: message.uri,
                        shortname: message.shortName,
                        token: message.token,
                        apiRoot: message.apiRoot,
                        ignoreSslWarn: message.ignoreSslWarn,
                    });
                    navigate(message.route);
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
    }, []);

    useEffect(() => {
        if (token && apiRoot && shortname) {
            // IF ignoreSslWarn is true then don't fail on invalid certificate

            let reqApiRoot: string = apiRoot || '';

            if (ignoreSslWarn && apiRoot) {
                reqApiRoot = (apiRoot as string).replace('https', 'http');
            }

            fetch(`${reqApiRoot}i/${shortname}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
                .then((response) => response.json())
                .then((data) => {
                    setFetchedData(data);
                    console.log(data);
                })
                .catch((error) => {
                    console.error('Error fetching data:', error);
                });
        }
    }, [token, apiRoot, shortname]);

    return (
        <ViewDataContext.Provider value={viewData}>
            <Routes>
                <Route
                    path="/plots"
                    element={
                        <FetchedDataContext.Provider value={fetchedData}>
                            <NovemViewPlot />
                        </FetchedDataContext.Provider>
                    }
                />
                <Route
                    path="/mails"
                    element={
                        <FetchedDataContext.Provider value={fetchedData}>
                            <NovemViewMail />
                        </FetchedDataContext.Provider>
                    }
                />
                <Route path="/profile" element={<NovemViewProfile />} />
                <Route
                    path="/"
                    element={<div>Hello World from Novem Web View!</div>}
                />
            </Routes>
        </ViewDataContext.Provider>
    );
};

const App = () => {
    return (
        <Router>
            <MainContent />
        </Router>
    );
};

export default App;
