/*******************************************************************************
 * Licensed Materials - Property of IBM
 * (c) Copyright IBM Corporation 2016. All Rights Reserved.
 *
 * Note to U.S. Government Users Restricted Rights:
 * Use, duplication or disclosure restricted by GSA ADP Schedule
 * Contract with IBM Corp.
 *******************************************************************************/

import React from "react";
import { Checkbox } from "ap-components-react/dist/ap-components-react";
import EditorControl from "./editor-control.jsx";

export default class CheckboxControl extends EditorControl {
	constructor(props) {
		super(props);
		this.state = {
			controlValue: props.valueAccessor(props.control.name)[0]
		};
		this.getControlValue = this.getControlValue.bind(this);
		this.handleChange = this.handleChange.bind(this);
	}

	handleChange(evt) {
		var newValue = evt.target.checked ? newValue = "true" : newValue = "false";
		var that = this;
		this.setState({
			controlValue: newValue
		}, function() {
			that.validateInput();
		});
		this.notifyValueChanged(this.props.control.name, newValue);
		this.props.updateControlValue(this.props.control.name, newValue);
	}

	getControlValue() {
		return [this.state.controlValue];
	}

	render() {
		var checked = this.state.controlValue === "true";
		const controlName = this.getControlID().split(".")[1];
		const conditionProps = {
			controlName: controlName,
			controlType: "selection"
		};
		const conditionState = this.getConditionMsgState(conditionProps);

		const errorMessage = conditionState.message;
		const stateDisabled = conditionState.disabled;
		const stateStyle = conditionState.style;

		var cb = (<Checkbox {...stateDisabled}
			style={stateStyle}
			id={this.getControlID()}
			name={this.props.control.label.text}
			onChange={this.handleChange}
			checked={checked}
		/>);

		return (
			<div className="checkbox editor_control_area" style={stateStyle}>
				{cb}
				{errorMessage}
			</div>
		);
	}
}

CheckboxControl.propTypes = {
	control: React.PropTypes.object,
	controlStates: React.PropTypes.object,
	validationDefinitions: React.PropTypes.object,
	updateValidationErrorMessage: React.PropTypes.func,
	retrieveValidationErrorMessage: React.PropTypes.func,
	updateControlValue: React.PropTypes.func
};
