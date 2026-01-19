import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import "leaflet/dist/leaflet.css"
import L from 'leaflet'
import { useState, useEffect, useRef } from 'react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const signalEmoji = (state) => L.divIcon({
    html: `<div style="font-size: 30px;">${state === "GREEN" ? "🟢" : "🔴"}</div>`,
    className: 'dummy',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

const ambulanceEmoji = L.divIcon({
    html: `<div style="font-size: 30px;">🚑</div>`,
    className: 'dummy',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

const carIcon = L.divIcon({
    html: `<div style="font-size: 25px;">🚗</div>`,
    className: 'dummy',
    iconSize: [25, 25],
    iconAnchor: [12, 12]
});

function MapView() {
    const defaultRoute = [];
    const center = [9.9930419, 76.3017048];
    const [selectedHospital, setSelectedHospital] = useState(null);
    const [initialETA, setInitialETA] = useState(null);
    const [startTime, setStartTime] = useState(null);
    const [etaLogged, setEtaLogged] = useState(false);
    const [etaBias, setEtaBias] = useState({
        morning: 0,
        afternoon: 0,
        night: 0
    });
    const ARRIVAL_THRESHOLD_METERS = 15;
    const [arrived, setArrived] = useState(false);
    const [route, setRoute] = useState(defaultRoute);
    const [segmentIndex, setsegmentIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [currentPosition, setCurrentPosition] = useState(center);
    const [criticality, setCriticality] = useState("CRITICAL");
    const [signals, setSignals] = useState([
        { id: 1, position: [9.9954740, 76.3014861], state: "RED" },
        { id: 2, position: [9.992308, 76.289544], state: "RED" },
        { id: 3, position: [9.9954740, 76.3014861], state: "RED" },
        { id: 4, position: [9.994999, 76.292152], state: "RED" },
        { id: 5, position: [9.985764, 76.281511], state: "RED" },
    ]);
    const [hospitalETAs, setHospitalETAs] = useState([]);
    const audioContextRef = useRef(null);
    const [deviceId] = useState(() => `device_${Math.random().toString(36).substr(2, 9)}`);
    const [isMaster, setIsMaster] = useState(true);
    const syncIntervalRef = useRef(null);

    const [cars, setCars] = useState([
        { id: 1, position: [9.995211, 76.301557], moving: false },
        { id: 2, position: [9.995467, 76.292663], moving: false },
        { id: 3, position: [9.992654, 76.289889], moving: false },
        { id: 4, position: [9.985862, 76.281859], moving: false }
    ]);

    const beepIntervalRef = useRef(null);

    const routeLisie = [[9.9908649, 76.3021516], [9.9911956, 76.3021332], [9.9930340, 76.3018243], [9.9954740, 76.3014861], [9.9960327, 76.3013843], [10.000012, 76.299828], [10.000501, 76.299491], [9.999308, 76.297643], [9.998461, 76.296715], [9.996584, 76.294248], [9.994999, 76.292152], [9.992308, 76.289544], [9.990960, 76.287916], [9.989032, 76.288637], [9.988078, 76.288166]];
    const routeAsterMedcity = [];
    const routeRennai = [];

    const saveSyncState = async (data) => {
        try {
            await window.storage.set('ambulance_sync', JSON.stringify(data), true);
        } catch (e) {
            console.error('Sync save failed:', e);
        }
    };

    const getSyncState = async () => {
        try {
            const result = await window.storage.get('ambulance_sync', true);
            return result ? JSON.parse(result.value) : null;
        } catch (e) {
            return null;
        }
    };

  useEffect(() => {
    if (!isMaster) {
      console.log('Not master - not broadcasting');
      return;
    }
    
    if (!route.length) {
      console.log('No route set - not broadcasting');
      return;
    }

    console.log('MASTER: Starting broadcast');

    const broadcastState = async () => {
      const threshold = getThresholdDistance();
      const signalDistances = signals.map(signal => ({
        id: signal.id,
        distance: getDistanceInMeters(
          currentPosition[0], currentPosition[1],
          signal.position[0], signal.position[1]
        )
      }));

      const nearbySignals = signalDistances
        .filter(s => s.distance < threshold && s.distance > 10)
        .map(s => s.id);

      const dataToSave = {
        position: currentPosition,
        nearbySignals,
        criticality,
        timestamp: Date.now(),
        masterId: deviceId,
        route: route,
        segmentIndex: segmentIndex,
        arrived: arrived
      };

      console.log('Broadcasting:', {
        position: currentPosition,
        nearbySignals: nearbySignals.length,
        criticality
      });

      await saveSyncState(dataToSave);
    };

    broadcastState();
    const interval = setInterval(broadcastState, 200);
    return () => {
      console.log('Stopping master broadcast');
      clearInterval(interval);
    };
  }, [isMaster, currentPosition, criticality, signals, route, segmentIndex, arrived, deviceId]);

// Listen for sync state changes (follower devices)
  useEffect(() => {
    if (isMaster) {
      console.log('Running as MASTER - not listening for sync');
      return;
    }

    console.log('Running as FOLLOWER - starting sync listener');

    const checkSyncState = async () => {
      try {
        const syncData = await getSyncState();
        
        if (!syncData) {
          console.log('No sync data found in storage');
          return;
        }

        if (syncData.masterId === deviceId) {
          console.log('Ignoring own broadcast');
          return;
        }

        const age = Date.now() - syncData.timestamp;
        if (age > 2000) {
          console.log('Sync data too old:', age, 'ms');
          return;
        }

        console.log('SYNCING! Master position:', syncData.position);

        // Update follower's view with master's position
        if (syncData.position) {
          console.log('📍 Updating position to:', syncData.position);
          setCurrentPosition(syncData.position);
        }

        // Update route if available
        if (syncData.route && syncData.route.length > 0) {
          console.log('🛣️ Updating route, length:', syncData.route.length);
          setRoute(syncData.route);
          setsegmentIndex(syncData.segmentIndex || 0);
        }

        // Update criticality
        if (syncData.criticality) {
          console.log('🚨 Updating criticality to:', syncData.criticality);
          setCriticality(syncData.criticality);
        }

        // Update arrived status
        if (syncData.arrived !== undefined) {
          setArrived(syncData.arrived);
        }

        // Update signal states based on master's position
        if (syncData.position) {
          const threshold = syncData.criticality === "STABLE" ? 40 :
                           syncData.criticality === "CRITICAL" ? 80 :
                           syncData.criticality === "VERY CRITICAL" ? 200 : 60;

          setSignals(prev => prev.map(signal => {
            const d = getDistanceInMeters(
              syncData.position[0], syncData.position[1],
              signal.position[0], signal.position[1]
            );
            return { ...signal, state: d <= threshold ? "GREEN" : "RED" };
          }));
        }

        // Handle beeping
        if (syncData.nearbySignals && syncData.nearbySignals.length > 0) {
          console.log('🔊 Should beep! Nearby signals:', syncData.nearbySignals);
          if (!beepIntervalRef.current) {
            const delay = Math.random() * 300;
            setTimeout(() => {
              triggerBeep();
              const intervalId = setInterval(() => {
                triggerBeep();
              }, 500);
              beepIntervalRef.current = intervalId;
            }, delay);
          }
        } else {
          if (beepIntervalRef.current) {
            console.log('Stopping beeps');
            clearInterval(beepIntervalRef.current);
            beepIntervalRef.current = null;
          }
        }
      } catch (error) {
        console.error('Sync error:', error);
      }
    };

    checkSyncState();

    syncIntervalRef.current = setInterval(checkSyncState, 200);
    
    return () => {
      console.log('Stopping follower sync listener');
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (beepIntervalRef.current) {
        clearInterval(beepIntervalRef.current);
        beepIntervalRef.current = null;
      }
    };
  }, [isMaster, deviceId]);

    useEffect(() => {
        if (!route.length || arrived) return;
        if (hasArrived()) {
            setArrived(true);
        }
    }, [currentPosition, route, arrived]);

    useEffect(() => {
        if (!arrived || etaLogged || !startTime || initialETA === null) return;

        const actualTime = Math.round((Date.now() - startTime) / 1000);
        const error = actualTime - initialETA;
        const learningRate = 0.2;
        const bucket = getTimeBucket();

        setEtaBias(prev => {
            const updated = {
                ...prev,
                [bucket]: prev[bucket] + learningRate * error
            };
            return updated;
        });

        setEtaLogged(true);
    }, [arrived]);

    const hospitalRoutes = [
        { id: "H1", name: "Lisie Hospital", route: routeLisie },
        { id: "H3", name: "Aster Medcity", route: routeAsterMedcity },
        { id: "H5", name: "Renai Medicity", route: routeRennai }
    ];

    const getThresholdDistance = () => {
        if (criticality === "STABLE") return 40;
        if (criticality === "CRITICAL") return 80;
        if (criticality === "VERY CRITICAL") return 200;
        return 60;
    }

    const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const hasArrived = () => {
        if (!route || route.length === 0) return false;
        const [endLat, endLng] = route[route.length - 1];
        const [curLat, curLng] = currentPosition;
        return getDistanceInMeters(curLat, curLng, endLat, endLng) <= ARRIVAL_THRESHOLD_METERS;
    };

    useEffect(() => {
        if (!route || route.length < 2 || !isMaster) return;

        const speed = 0.15;
        const interval = setInterval(() => {
            if (hasArrived()) {
                clearInterval(interval);
                return;
            }

            if (segmentIndex >= route.length - 1) {
                return;
            }

            const [lat1, lng1] = route[segmentIndex];
            const [lat2, lng2] = route[segmentIndex + 1];

            const newProgress = progress + speed;
            let lat, lng;

            if (newProgress >= 1) {
                setsegmentIndex(segmentIndex + 1);
                setProgress(0);
                [lat, lng] = route[segmentIndex + 1];
                setCurrentPosition([lat, lng]);
            } else {
                lat = lat1 + (lat2 - lat1) * newProgress;
                lng = lng1 + (lng2 - lng1) * newProgress;
                setProgress(newProgress);
                setCurrentPosition([lat, lng]);
            }

            setSignals(prev =>
                prev.map(signal => {
                    const d = getDistanceInMeters(
                        lat, lng,
                        signal.position[0],
                        signal.position[1]
                    );
                    return {
                        ...signal,
                        state: d <= getThresholdDistance() ? "GREEN" : "RED"
                    };
                })
            );

            setCars(prev =>
                prev.map(car => {
                    const d = getDistanceInMeters(
                        lat, lng,
                        car.position[0],
                        car.position[1]
                    );

                    if (d < 80 && !car.movedAside) {
                        return {
                            ...car,
                            position: [
                                car.position[0] - 0.00008,
                                car.position[1] + 0.00008
                            ],
                            movedAside: true
                        };
                    }

                    return car;
                })
            );

            const threshold = getThresholdDistance();
            const signalDistances = signals.map(signal => ({
                id: signal.id,
                distance: getDistanceInMeters(
                    lat, lng,
                    signal.position[0],
                    signal.position[1]
                )
            }));

            let shouldBeep = false;
            signalDistances.forEach(({ distance }) => {
                if (distance < threshold && distance > 10) {
                    shouldBeep = true;
                }
            });

            if (shouldBeep && !beepIntervalRef.current) {
                triggerBeep();
                const intervalId = setInterval(() => {
                    triggerBeep();
                }, 500);
                beepIntervalRef.current = intervalId;
            }

            if (!shouldBeep && beepIntervalRef.current) {
                clearInterval(beepIntervalRef.current);
                beepIntervalRef.current = null;
            }
        }, 100);

        return () => {
            clearInterval(interval);
            if (beepIntervalRef.current) {
                clearInterval(beepIntervalRef.current);
                beepIntervalRef.current = null;
            }
        };
    }, [segmentIndex, progress, criticality, route, isMaster]);

    const getCorridorConfig = () => {
        if (criticality === "STABLE") return { color: "blue" };
        if (criticality === "CRITICAL") return { color: "orange" };
        if (criticality === "VERY CRITICAL") return { color: "red" };
        return null;
    }

    const getCorridorPoints = () => {
        const points = [currentPosition];
        for (let i = segmentIndex + 1; i < route.length; i++) {
            points.push(route[i]);
        }
        return points;
    };

    const AMBULANCE_SPEED = 12;

    const geDelayTime = () => {
        if (criticality === "STABLE") return 10;
        if (criticality === "CRITICAL") return 5;
        if (criticality === "VERY CRITICAL") return 2;
        return 8;
    }

    const getDistance = () => {
        let distance = 0;
        if (segmentIndex < route.length - 1) {
            distance += getDistanceInMeters(currentPosition[0], currentPosition[1], route[segmentIndex + 1][0], route[segmentIndex + 1][1]);
        }
        for (let i = segmentIndex + 1; i < route.length - 1; i++) {
            distance += getDistanceInMeters(route[i][0], route[i][1], route[i + 1][0], route[i + 1][1]);
        }
        return distance;
    }

    const getRedSignalsAheadCount = () => {
        let count = 0;
        const remainingDistance = getDistance();

        signals.forEach(signal => {
            const distanceToSignal = getDistanceInMeters(
                currentPosition[0], currentPosition[1],
                signal.position[0], signal.position[1]
            );

            if (distanceToSignal <= remainingDistance && signal.state === "RED") {
                count++;
            }
        });
        return count;
    };

    const ETAseconds = () => {
        const remainingDistance = getDistance();
        const travelTime = remainingDistance / AMBULANCE_SPEED;
        const redSignalsAhead = getRedSignalsAheadCount();
        const signalDelay = redSignalsAhead * geDelayTime();
        const bucket = getTimeBucket();

        return Math.max(
            0,
            Math.round(travelTime + signalDelay + etaBias[bucket])
        );
    };

    const formETA = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins} mins ${secs} secs`;
    }

    const autoSelectNearestHospital = () => {
        if (beepIntervalRef.current) {
            clearInterval(beepIntervalRef.current);
            beepIntervalRef.current = null;
        }

        setCars([
            { id: 1, position: [9.995211, 76.301557], movedAside: false },
            { id: 2, position: [9.995467, 76.292663], movedAside: false },
            { id: 3, position: [9.992654, 76.289889], movedAside: false },
            { id: 4, position: [9.985862, 76.281859], movedAside: false }
        ]);

        let nearestHospital = null;
        let bestETA = Infinity;

        const etaList = hospitalRoutes.map(h => ({
            id: h.id,
            name: h.name,
            eta: computeETAForRoute(h.route, etaBias)
        }));
        setHospitalETAs(etaList);

        hospitalRoutes.forEach(hospital => {
            const eta = computeETAForRoute(hospital.route, etaBias);
            if (eta < bestETA) {
                bestETA = eta;
                nearestHospital = hospital;
            }
        });

        if (!nearestHospital || nearestHospital.route.length < 2) {
            alert("No valid hospital routes found.");
            return;
        }

        setSelectedHospital(nearestHospital);
        setRoute(nearestHospital.route);
        setsegmentIndex(0);
        setProgress(0);
        setCurrentPosition(nearestHospital.route[0]);

        let totalD = 0;
        for (let i = 0; i < nearestHospital.route.length - 1; i++) {
            totalD += getDistanceInMeters(
                nearestHospital.route[i][0], nearestHospital.route[i][1],
                nearestHospital.route[i + 1][0], nearestHospital.route[i + 1][1]
            );
        }

        const initialTravelTime = totalD / AMBULANCE_SPEED;
        setInitialETA(Math.round(initialTravelTime));
        setStartTime(Date.now());
        setArrived(false);
        setEtaLogged(false);
    };

    const computeETAForRoute = (testRoute, bias = etaBias) => {
        if (!testRoute || testRoute.length < 2) return Infinity;

        let distance = 0;
        for (let i = 0; i < testRoute.length - 1; i++) {
            distance += getDistanceInMeters(
                testRoute[i][0], testRoute[i][1],
                testRoute[i + 1][0], testRoute[i + 1][1]
            );
        }

        const travelTime = distance / AMBULANCE_SPEED;
        const signalDelay =
            signals.filter(s => s.state === "RED").length * geDelayTime();

        const bucket = getTimeBucket();
        return Math.round(travelTime + signalDelay + bias[bucket]);
    };

    const getTimeBucket = () => {
        const h = new Date().getHours();
        if (h < 10) return "morning";
        if (h < 18) return "afternoon";
        return "night";
    };

    const resetLearning = () => {
        setEtaBias({
            morning: 0,
            afternoon: 0,
            night: 0
        });
        setEtaLogged(false);
        setArrived(false);
        console.log("Learning reset");
    };

    const triggerBeep = () => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }

            const audioContext = audioContextRef.current;

            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.error('Beep failed:', error);
        }
    };

    return (
        <div style={{ position: "relative" }}>
            <div style={{
                position: 'absolute',
                top: 40,
                left: 50,
                zIndex: 1000,
                background: "white",
                padding: "10px",
                borderRadius: "5px",
                display: "flex",
                flexDirection: "column",
                gap: "5px",
                boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                maxHeight: "90vh",
                overflowY: "auto"
            }}>
                <div style={{ 
                    background: isMaster ? "#4caf50" : "#ff9800", 
                    color: "white", 
                    padding: "8px", 
                    borderRadius: "4px",
                    fontWeight: "bold",
                    textAlign: "center"
                }}>
                    {isMaster ? "🚑 MASTER (Ambulance)" : "📱 FOLLOWER (Traffic Light)"}
                </div>

                <button
                    style={{ 
                        background: isMaster ? "#666" : "#4caf50", 
                        color: "white", 
                        fontWeight: "bold" 
                    }}
                    onClick={() => setIsMaster(!isMaster)}
                >
                    {isMaster ? "Switch to Follower" : "Switch to Master"}
                </button>

                <button
                    style={{ background: "#d32f2f", color: "white", fontWeight: "bold" }}
                    onClick={async () => {
                        try {
                            if (!audioContextRef.current) {
                                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
                            }

                            if (audioContextRef.current.state === 'suspended') {
                                await audioContextRef.current.resume();
                            }

                            triggerBeep();
                            alert("Driver alerts enabled! State: " + audioContextRef.current.state);
                        } catch (error) {
                            alert("Audio failed - check console");
                        }
                    }}
                >
                    ENABLE DRIVER ALERTS
                </button>

                {isMaster && (
                    <>
                        <button onClick={() => setCriticality("STABLE")}>STABLE</button>
                        <button onClick={() => setCriticality("CRITICAL")}>CRITICAL</button>
                        <button onClick={() => setCriticality("VERY CRITICAL")}>VERY CRITICAL</button>

                        <div style={{ color: "black", marginTop: "10px", fontWeight: "bold", borderTop: "1px solid #ddd", paddingTop: "5px" }}>
                            ETA: {formETA(ETAseconds())}
                        </div>

                        {hospitalETAs.length > 0 && (
                            <div style={{ marginTop: "10px", fontSize: "13px" }}>
                                <b>Hospital ETAs</b>
                                {hospitalETAs.map(h => (
                                    <div
                                        key={h.id}
                                        style={{
                                            color: selectedHospital?.id === h.id ? "green" : "black",
                                            fontWeight: selectedHospital?.id === h.id ? "bold" : "normal"
                                        }}
                                    >
                                        {h.name}: {formETA(h.eta)}
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            style={{ background: "#1976d2", color: "white", fontWeight: "bold", marginTop: "5px" }}
                            onClick={autoSelectNearestHospital}
                        >
                            AUTO SELECT NEAREST
                        </button>

                        <button
                            style={{ background: "#d32f2f", color: "white", marginTop: "5px" }}
                            onClick={resetLearning}
                        >
                            RESET LEARNING
                        </button>
                    </>
                )}

                <div style={{ fontSize: "11px", color: "#666", marginTop: "5px", padding: "5px", background: "#f0f0f0", borderRadius: "3px" }}>
                    Device ID: {deviceId.substr(0, 8)}
                </div>
            </div>

            <MapContainer center={center} zoom={15} style={{ height: "100vh", width: "100vw" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="©️ OpenStreetMap" />

                {getCorridorConfig() && (
                    <Polyline positions={getCorridorPoints()} pathOptions={{ color: getCorridorConfig().color, weight: 6, opacity: 1 }} />
                )}

                <Marker position={currentPosition} icon={ambulanceEmoji}>
                    <Popup><b>Ambulance</b><br />Criticality: {criticality}</Popup>
                </Marker>

                {signals.map(signal => (
                    <Marker
                        key={signal.id}
                        position={signal.position}
                        icon={signalEmoji(signal.state)}
                    >
                        <Popup>
                            <b>Traffic Signal</b><br />
                            State: {signal.state}
                        </Popup>
                    </Marker>
                ))}

                {cars.map(car => (
                    <Marker
                        key={car.id}
                        position={car.position}
                        icon={carIcon}
                    >
                        <Popup>Normal Vehicle</Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    )
}

export default MapView;