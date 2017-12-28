import React, { Component } from 'react';
import {
	Platform,
	StyleSheet,
	Button,
	Slider,
	Text,
	View,
	TouchableHighlight,
	Image,
	Animated,
	PanResponder,
} from 'react-native';
import Orientation from 'react-native-orientation';

export default class App extends Component<{}> {
	constructor(props) {
		super(props);

		this.state = {
			motorsStatus: {
				value: 'Motors on',
				color: '#27AE60', // Red
			},
			speedLevel: 'fast',
			joystick: { 
				x: 0, 
				y: 0,
				maxValue: 100,
			},
			speedButtons: {
				slow: '#373D3F', // Red
				medium: '#373D3F', // Black
				fast: '#E74C3C', // Black
			},
			pan: new Animated.ValueXY(),
			scale: new Animated.Value(0.3),			
		}
	}

	componentWillMount() {
		try {
			this.ws = new WebSocket('ws://192.168.0.87:3000');

			this.ws.onopen = () => {
				this.ws.send(JSON.stringify({ 'event': 'connection', 'client': 'React Native' }));
			};

			this.ws.onmessage = (e) => {
				console.log('SERVER' + e.data);
			};

			this.ws.onerror = (e) => {
				console.log(e);
			};

			this.ws.onclose = (e) => {
				this.ws.send('close');
				console.log(e.code, e.reason);
			};
		}
		catch(e) {
			console.warn(e);
		}

		this._panResponder = PanResponder.create({
			onMoveShouldSetResponderCapture: () => true,
			onMoveShouldSetPanResponderCapture: () => true,

			// Executed on start
			onPanResponderGrant: (e, gestureState) => {
				this.state.pan.setOffset({ x: this.state.pan.x._value, y: this.state.pan.y._value });
				this.state.pan.setValue({ x: 0, y: 0 });
			},

			// Executed on move
			onPanResponderMove: (e, gestureState) => {
				let x = gestureState.dx;
				let y = gestureState.dy;
				
				if (x * x + y * y > this.state.joystick.maxValue * this.state.joystick.maxValue) {
					let border_y = this.state.joystick.maxValue / Math.sqrt(x * x / (y * y) + 1);
					border_y = y < 0 ? -border_y : border_y; 
					
					let border_x = x * border_y / y;

					gestureState.dx = border_x;
					gestureState.dy = border_y;
				}

				let hasModified = false;

				// Verify if x coord modified with at least 2
				if (Math.abs(this.state.joystick.x - x) >= 2) {
					this.state.joystick.x = x;
					hasModified = true;
				}

				// Verify if y coord modified with at least 2				
				if (Math.abs(this.state.joystick.y - y) >= 2) {
					this.state.joystick.y = y;
					hasModified = true;
				}

				if (hasModified) {
					this.sendMoveEvent();
				}

				// Animate the button move
				return Animated.event([
					null, { dx: this.state.pan.x, dy: this.state.pan.y },
				])(e, gestureState);
			},

			// Executed on release
			onPanResponderRelease: () => {
				this.state.pan.setValue({ x: 0, y: 0 });
				this.state.pan.flattenOffset();

				this.state.joystick.x = 0;
				this.state.joystick.y = 0;

				this.sendMoveEvent();
			}
		});
	}
	
	componentDidMount() {
		Orientation.lockToLandscape();
	}

	sendMoveEvent()
	{
		this.ws.send(JSON.stringify({ 
			'event': 'move', 
			'joystick_max_value': this.state.joystick.maxValue,
			'speed_level': this.state.speedLevel,
			'joystick_x': this.state.joystick.x, 
			'joystick_y': this.state.joystick.y 
		}));
	}

	toggleMotorsStatus = () =>
	{
		if (this.state.motorsStatus.value === 'Motors off') {
			this.setState({
				motorsStatus: {
					value: 'Motors on',
					color: '#27AE60', // Green
				}
			});

			this.ws.send(JSON.stringify({
				'event': 'turn_motors',
				'status': 'off',
			}));
		}
		else {
			this.setState({
				motorsStatus: {
					value: 'Motors off',
					color: '#E74C3C', // Red
				}
			});

			this.ws.send(JSON.stringify({
				'event': 'turn_motors',
				'status': 'on',
			}));
		}
	}

	changeSpeedLevel = (value) =>
	{
		// Change buttons color based on value
		switch (value) {
			case 'slow':
				this.setState({
					speedButtons: {
						slow: '#E74C3C', // Red
						medium: '#373D3F', // Black
						fast: '#373D3F', // Black
					}
				});
				break;
			case 'medium':
				this.setState({
					speedButtons: {
						slow: '#373D3F', // Black
						medium: '#E74C3C', // Red
						fast: '#373D3F', // Black
					}
				});
				break;
			case 'fast':
				this.setState({
					speedButtons: {
						slow: '#373D3F', // Black
						medium: '#373D3F', // Black
						fast: '#E74C3C', // Red
					}
				});
				break;
			default:
				break;
		}

		this.setState({ 'speedLevel': value });
	}

	render() 
	{
		let { pan, scale } = this.state;
		let [translateX, translateY] = [pan.x, pan.y];
		let imageStyle = { transform: [{ translateX }, { translateY }, { scale }] };

		return (
			<View style={ styles.container }>			
				<View style={ styles.topContainer }>
					<Button onPress={ () => { this.changeSpeedLevel('slow') } } title="Slow" color={ this.state.speedButtons.slow }></Button>
					<Button onPress={ () => { this.changeSpeedLevel('medium') } } title="Medium" color={ this.state.speedButtons.medium }></Button>
					<Button onPress={ () => { this.changeSpeedLevel('fast') } } title="Fast" color={ this.state.speedButtons.fast }></Button>
					<Button onPress={this.toggleMotorsStatus} title={this.state.motorsStatus.value} color={ this.state.motorsStatus.color }></Button>
				</View>
				<View style={styles.bottomContainer}>				
					<View style={styles.joystickContainer}>
						<View style={styles.circle} scrollEnabled={false}>
							<Animated.View style={imageStyle} {...this._panResponder.panHandlers}>
								<Image source={require('./src/assets/pan.png')} />
							</Animated.View>
						</View>
					</View>

					<View style={styles.cameraContainer}>
					</View>
				</View>
			</View>
		);
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: 'column',
	},
	topContainer: {
		flex: 0.1,
		flexDirection: 'row',
		alignItems: 'center',	
		justifyContent: 'space-around'
	},
	bottomContainer: {
		flex: 0.9,
		flexDirection: 'row',
	},
	joystickContainer: {
		flex: 0.45,
		justifyContent: 'center',
	},
	cameraContainer: {
		flex: 0.55,
	},
	circle: {
		alignItems: 'center',
		justifyContent: 'flex-end',		
		borderRadius: 300,
		borderWidth: 2,
		width: 270,
		height: 270,
		borderColor:'rgba(0,0,0,0.1)',
		backgroundColor: '#FFFFFF'
	},
});
