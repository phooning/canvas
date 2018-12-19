/*******************************************************************************
 * Licensed Materials - Property of IBM
 * (c) Copyright IBM Corporation 2017, 2018. All Rights Reserved.
 *
 * Note to U.S. Government Users Restricted Rights:
 * Use, duplication or disclosure restricted by GSA ADP Schedule
 * Contract with IBM Corp.
 *******************************************************************************/
// Base class for table controls

import React from "react";
import PropTypes from "prop-types";
import IconButton from "./../components/icon-button";
import Checkbox from "carbon-components-react/lib/components/Checkbox";
import FlexibleTable from "./../components/flexible-table";
import SubPanelCell from "./../panels/sub-panel/cell.jsx";
import ReadonlyControl from "./readonly";
import Icon from "./../../icons/icon.jsx";
import PropertyUtils from "./../util/property-utils";
import { ControlType, EditStyle } from "./../constants/form-constants";
import Tooltip from "./../../tooltip/tooltip.jsx";
import { MESSAGE_KEYS, MESSAGE_KEYS_DEFAULTS, TOOL_TIP_DELAY, STATES,
	TABLE_SCROLLBAR_WIDTH, TABLE_SUBPANEL_BUTTON_WIDTH } from "./../constants/constants";

import findIndex from "lodash/findIndex";
import sortBy from "lodash/sortBy";
import cloneDeep from "lodash/cloneDeep";
import isEqual from "lodash/isEqual";
import uuid4 from "uuid/v4";

/* eslint max-depth: ["error", 5] */

export default class AbstractTable extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			filterText: null,
			enableRemoveIcon: false
		};
		this.onPanelContainer = [];

		this.indexOfColumn = this.indexOfColumn.bind(this);
		this.setCurrentControlValueSelected = this.setCurrentControlValueSelected.bind(this);
		this.setReadOnlyColumnValue = this.setReadOnlyColumnValue.bind(this);
		this.removeSelected = this.removeSelected.bind(this);
		this.updateRowSelections = this.updateRowSelections.bind(this);
		this.handleRowClick = this.handleRowClick.bind(this);
		this.getRowClassName = this.getRowClassName.bind(this);
		this.createTable = this.createTable.bind(this);
		this.onFilter = this.onFilter.bind(this);
		this.onSort = this.onSort.bind(this);
		this.setScrollToRow = this.setScrollToRow.bind(this);
		this.includeInFilter = this.includeInFilter.bind(this);
		this.makeAddRemoveButtonPanel = this.makeAddRemoveButtonPanel.bind(this);
		this.buildChildItem = this.buildChildItem.bind(this);
		this.makeCells = this.makeCells.bind(this);
		this.checkedAll = this.checkedAll.bind(this);

		if (props.selectedRows && props.selectedRows.length > 0) {
			this.scrollToRow = props.selectedRows[props.selectedRows.length - 1];
			this.alignTop = true;
		}

		this.selectSummaryPropertyName = "table-multi-select-edit-property-" + props.control.name;
		props.controller.saveControls([{ name: this.selectSummaryPropertyName }]);
		this.setSelectedSummaryRowValue(props.selectedRows);
	}

	componentDidMount() {
		if (this.props.control.subControls) {
			const updatedControlValues = this.setReadOnlyColumnValue();
			this.props.controller.updatePropertyValue(this.props.propertyId, updatedControlValues, true);
		}
	}

	componentWillReceiveProps(nextProps) {
		const enableRemoveIcon = (nextProps.selectedRows.length !== 0);
		if (this.state.enableRemoveIcon !== enableRemoveIcon) {
			this.setState({ enableRemoveIcon: enableRemoveIcon });
		}
	}

	componentDidUpdate() {
		if (this.isSelectSummaryEdit(this.props.selectedRows)) {
			this.updateSelectedRowsValues();
		}
	}

	componentWillUnmount() {
		this.props.controller.removePropertyValue({ name: this.selectSummaryPropertyName });
	}

	onFilter(filterString) {
		this.setState({ filterText: filterString });
	}

	onSort(spec) {
		let controlValue = this.props.value;
		let col = -1;
		for (var colIndex = 0; colIndex < this.props.control.subControls.length; colIndex++) {
			if (this.props.control.subControls[colIndex].name === spec.column) {
				col = colIndex;
				break;
			}
		}
		if (col > -1) {
			controlValue = sortBy(controlValue, function(row) {
				return row[col];
			});
			if (spec.direction < 0) {
				controlValue = controlValue.reverse();
			}
			this.setCurrentControlValueSelected(controlValue, []);
		}
	}


	getOnPanelContainer(selectedRows) {
		if (this.onPanelContainer.length === 0 || selectedRows.length === 0 ||
			this.isSelectSummaryEdit(selectedRows)) {
			return (<div />);
		}

		return (<div className="properties-onpanel-container">{this.onPanelContainer[selectedRows[0]]}</div>);
	}

	getRowClassName(rowIndex, selectSummaryRow) {
		return this.props.selectedRows.indexOf(rowIndex) >= 0 && !selectSummaryRow
			? "table-row table-selected-row "
			: "table-row";
	}

	getDefaultRow() {
		const row = [];
		for (const colValue of this.props.control.defaultRow) {
			if (typeof colValue !== "undefined" && colValue !== null && colValue.parameterRef) {
				row.push(this.props.controller.getPropertyValue({ name: colValue.parameterRef }));
			} else {
				row.push(colValue);
			}
		}
		return row;
	}

	setScrollToRow(row, alignTop) {
		this.scrollToRow = row;
		this.alignTop = alignTop;
	}

	setCurrentControlValueSelected(controlValue, inSelectedRows) {
		let updatedControlValues = controlValue;
		if (this.props.control.subControls) {
			updatedControlValues = this.setReadOnlyColumnValue(controlValue);
		}

		// Here we convert any compound field strings into compound values for storage
		if (Array.isArray(updatedControlValues)) {
			for (let idx = 0; idx < updatedControlValues.length; idx++) {
				const value = updatedControlValues[idx];
				if (Array.isArray(value)) {
					for (let idx2 = 0; idx2 < this.props.control.subControls.length; idx2++) {
						const subControl = this.props.control.subControls[idx2];
						if (subControl.role === "column" && subControl.valueDef.propType === "structure") {
							updatedControlValues[idx][idx2] = PropertyUtils.fieldStringToValue(
								value[idx2], subControl, this.props.controller);
						}
					}
				} else if (this.props.control.role === "column" && this.props.control.valueDef.propType === "structure") {
					updatedControlValues[idx] = PropertyUtils.fieldStringToValue(
						value, this.props.control, this.props.controller);
				}
			}
		}

		// Update the property value
		this.props.controller.updatePropertyValue(this.props.propertyId, updatedControlValues);
		const selectedRows = Array.isArray(inSelectedRows) ? inSelectedRows : [];
		this.updateRowSelections(this.props.control.name, selectedRows);
	}

	setReadOnlyColumnValue(controlValue) {
		const controlValues = controlValue ? controlValue : this.props.value;
		if (!Array.isArray(controlValues)) {
			return controlValues;
		}
		for (var rowIndex = 0; rowIndex < controlValues.length; rowIndex++) {
			for (var colIndex = 0; colIndex < this.props.control.subControls.length; colIndex++) {
				const columnDef = this.props.control.subControls[colIndex];
				if (columnDef.controlType === ControlType.READONLY && columnDef.generatedValues && columnDef.generatedValues.operation === "index") {
					const index = typeof columnDef.generatedValues.startValue !== "undefined" ? columnDef.generatedValues.startValue + rowIndex : rowIndex + 1;
					controlValues[rowIndex][colIndex] = index;
				}
			}
		}
		return controlValues;
	}

	// This will set the select summary row values either from the property value or the default values.
	setSelectedSummaryRowValue(selection) {
		if (this.isSelectSummaryEdit(selection)) {
			const summaryPropertyId = {
				name: this.selectSummaryPropertyName
			};
			let value = this.props.controller.getPropertyValue(summaryPropertyId);
			if (!value) {
				value = [this.getDefaultRow()];
				this.props.controller.updatePropertyValue(summaryPropertyId, value, true);
			}
			this.selectedSummaryRowValue = cloneDeep(value);
		}
	}

	isSelectSummaryEdit(selectedRows) {
		return (this.props.control.rowSelection === "multiple-edit" && selectedRows.length > 1);
	}

	indexOfColumn(controlId) {
		return findIndex(this.props.control.subControls, function(columnControl) {
			return columnControl.name === controlId;
		});
	}

	handleRowClick(rowIndex, selectSummaryRow, evt) {
		if (selectSummaryRow) {
			return;
		}
		let selectedRows = this.props.selectedRows;
		if (this.props.control.rowSelection === "single") {
			selectedRows = [rowIndex];
		} else if (evt.metaKey === true || evt.ctrlKey === true) {
			// If already selected then remove otherwise add
			const index = selectedRows.indexOf(rowIndex);
			if (index >= 0) {
				selectedRows.splice(index, 1);
			} else {
				selectedRows = selectedRows.concat(rowIndex);
			}
		} else if (evt.shiftKey === true) {
			const anchor = selectedRows.length > 0 ? selectedRows[0] : rowIndex;
			const start = anchor > rowIndex ? rowIndex : anchor;
			const end = (anchor > rowIndex ? anchor : rowIndex) + 1;
			const newSelns = [];
			for (let i = start; i < end; i++) {
				newSelns.push(i);
			}
			selectedRows = newSelns;
		} else {
			selectedRows = [rowIndex];
		}
		this.updateRowSelections(this.props.control.name, selectedRows);
	}

	// this will got through all selected rows and update any column value in the row with the
	// column value in the selected summary row that has changed.
	updateSelectedRowsValues() {
		const summaryPropertyId = {
			name: this.selectSummaryPropertyName
		};
		const newSelectedSummaryRow = this.props.controller.getPropertyValue(summaryPropertyId);
		if (newSelectedSummaryRow && Array.isArray(newSelectedSummaryRow)) {
			newSelectedSummaryRow[0].forEach((cellValue, colIndex) => {
				if (!isEqual(cellValue, this.selectedSummaryRowValue[0][colIndex])) {
					// if a column does not have a value, the default value is null and the value returned
					// from getPropertyValue is undefined causing unneccessary updates and an infinite loop during intialization
					const testCell = (typeof cellValue === "undefined") ? null : cellValue;
					this.props.selectedRows.forEach((rowIndex) => {
						this.props.controller.updatePropertyValue({ name: this.props.control.name, row: rowIndex, col: colIndex }, testCell, true);
					});
				}
			});
			this.selectedSummaryRowValue = cloneDeep(newSelectedSummaryRow);
		}
	}

	updateRowSelections(ctrlName, selection) {
		this.props.controller.updateSelectedRows(ctrlName, selection);
		// react throws warning when modal because the button does not exist at this moment
		if (this.props.rightFlyout) {
			this.setState({ enableRemoveIcon: (selection.length !== 0) });
		}
		this.setSelectedSummaryRowValue(selection);
	}

	removeSelected() {
		const rows = this.props.value;
		// Sort descending to ensure lower indices don"t get
		// changed when values are deleted
		const selected = this.props.selectedRows.sort(function(a, b) {
			return b - a;
		});
		for (let i = 0; i < selected.length; i++) {
			rows.splice(selected[i], 1);
			// this will remove any error messages associate with row.
			this.props.controller.removeErrorMessageRow({ name: this.props.propertyId.name, row: selected[i] });
		}

		this.setCurrentControlValueSelected(rows);
	}

	_makeCell(columnDef, controlValue, propertyName, rowIndex, colIndex, tableState, selectSummaryRow) {
		const propertyId = {
			name: propertyName,
			row: rowIndex,
			col: colIndex
		};
		const tableInfo = { table: true };
		const cellClassName = "";
		const ControlFactory = this.props.controller.getControlFactory();
		let cellContent;
		if (columnDef.editStyle === EditStyle.SUBPANEL || columnDef.editStyle === EditStyle.ON_PANEL) {
			if (selectSummaryRow) {
				cellContent = <div />;
			} else {
				cellContent = (<div className="properties-table-cell-control">
					<ReadonlyControl
						control={this.props.control}
						propertyId={propertyId}
						controller={this.props.controller}
						tableControl
						columnDef={columnDef}
					/>
				</div>);
				if (columnDef.editStyle === EditStyle.ON_PANEL) {
				// save the cell content in an object
					this.onPanelContainer[rowIndex].push(<div key={colIndex}><br />{ControlFactory.createControlItem(columnDef, propertyId)}</div>);
				}
			}
		} else { // defaults to inline control
			tableInfo.editStyle = EditStyle.INLINE;
			cellContent = (<div className="properties-table-cell-control">
				{ControlFactory.createControl(columnDef, propertyId, tableInfo)}
			</div>);

		}
		return {
			column: columnDef.name,
			width: columnDef.width,
			content: cellContent,
			className: cellClassName,
			value: this.props.controller.getPropertyValue(propertyId)
		};
	}
	_getCustomCtrlContent(propertyId, columnDef, defaultContent, tableInfo) {
		let cellContent = defaultContent;
		// allow the custom control to set the cell content
		if (columnDef.controlType === ControlType.CUSTOM) {
			tableInfo.editStyle = "summary";
			cellContent = this.props.controller.getCustomControl(propertyId, columnDef, tableInfo);
		}
		return cellContent;
	}

	_getDisabledStatus(cellPropertyId, tableState) {
		if (typeof tableState !== "undefined" && tableState === STATES.DISABLED) {
			return true;
		}
		const cellState = this.props.controller.getControlState(cellPropertyId);
		return cellState === STATES.DISABLED;
	}

	/**
	 * Returns true if the given row should be included
	 * in the current filter output.
	 */
	includeInFilter(rowIndex) {
		// If no search text, include all
		if (!this.state.filterText || this.state.filterText.length === 0) {
			return true;
		}
		const controlValue = this.props.value;
		for (let i = 0; i < this.filterFields.length; i++) {
			for (var colIndex = 0; colIndex < this.props.control.subControls.length; colIndex++) {
				const columnDef = this.props.control.subControls[colIndex];
				if (columnDef.name === this.filterFields[i]) {
					const value = controlValue[rowIndex][colIndex];
					if (value.toLowerCase().indexOf(this.state.filterText.toLowerCase()) > -1) {
						return true;
					}
					break;
				}
			}
		}
		return false;
	}

	hasFilter() {
		let hasFilter = false;
		if (this.props.control.subControls) {
			for (const subControl of this.props.control.subControls) {
				if (subControl.filterable) {
					hasFilter = true;
					break;
				}
			}
		}
		return hasFilter;
	}

	addOnClick(propertyId) {
		if (this.addOnClickCallback) {
			this.addOnClickCallback(propertyId, this.onFieldPickerCloseCallback);
		}
	}

	makeSelectedEditRow(selectedRows) {
		if (selectedRows && Array.isArray(selectedRows) && selectedRows.length > 1) {
			const rowsSelectedLabel = PropertyUtils.formatMessage(this.props.controller.getReactIntl(),
				MESSAGE_KEYS.MULTI_SELECTED_ROW_LABEL, MESSAGE_KEYS_DEFAULTS.MULTI_SELECTED_ROW_LABEL);
			const rowsSelectedAction = PropertyUtils.formatMessage(this.props.controller.getReactIntl(),
				MESSAGE_KEYS.MULTI_SELECTED_ROW_ACTION, MESSAGE_KEYS_DEFAULTS.MULTI_SELECTED_ROW_ACTION);
			const title = selectedRows.length + " " + rowsSelectedLabel + " " + rowsSelectedAction;
			const rows = [];
			const sortFields = [];
			const filterFields = [];
			const headers = (this.props.control.header === false) ? [] : this.makeHeader(sortFields, filterFields);
			const showHeader = false;
			const value = this.props.controller.getPropertyValue({ name: this.selectSummaryPropertyName });
			this.makeCells(rows, value, null, this.selectSummaryPropertyName, true);
			return (<div className="properties-at-selectedEditRows" >
				<div className="properties-selectedEditRows-title" >
					<span >{title}</span>
				</div>
				<FlexibleTable
					showHeader={showHeader}
					columns={headers}
					data={rows}
					rows={1}
					scrollKey={this.selectSummaryPropertyName}
					controller={this.props.controller}
				/>
			</div>);
		}
		return null;
	}


	makeAddRemoveButtonPanel(tableState, tableButtonConfig) {
		this.onFieldPickerCloseCallback = (tableButtonConfig && tableButtonConfig.fieldPickerCloseFunction)
			? tableButtonConfig.fieldPickerCloseFunction.bind(this)
			: null;

		const removeOnClick = (tableButtonConfig && tableButtonConfig.removeButtonFunction)
			? tableButtonConfig.removeButtonFunction
			: this.removeSelected;
		const disabled = !this.state.enableRemoveIcon || tableState === STATES.DISABLED;
		const removeButtonLabel = PropertyUtils.formatMessage(this.props.controller.getReactIntl(),
			MESSAGE_KEYS.STRUCTURETABLE_REMOVEBUTTON_LABEL, MESSAGE_KEYS_DEFAULTS.STRUCTURETABLE_REMOVEBUTTON_LABEL);
		const removeButton = (<button type="button" className="properties-remove-fields-button"
			onClick={removeOnClick}
			disabled={disabled}
			aria-label={removeButtonLabel}
		>
			<Icon type="remove" disabled={disabled} />
		</button>);

		let addButtonDisabled = false;
		this.addOnClickCallback = (tableButtonConfig && tableButtonConfig.addButtonFunction)
			? tableButtonConfig.addButtonFunction
			: this.props.openFieldPicker;
		const addButtonLabel = (tableButtonConfig && tableButtonConfig.addButtonLabel) ? tableButtonConfig.addButtonLabel
			: PropertyUtils.formatMessage(this.props.controller.getReactIntl(),
				MESSAGE_KEYS.STRUCTURETABLE_ADDBUTTON_LABEL, MESSAGE_KEYS_DEFAULTS.STRUCTURETABLE_ADDBUTTON_LABEL);
		if (tableState === STATES.DISABLED) {
			addButtonDisabled = true;
			this.addOnClickCallback = null;
		}
		const addButton = (
			<IconButton
				className="properties-add-fields-button"
				icon="add--outline"
				onClick={this.addOnClick.bind(this, this.props.propertyId)}
				disabled={addButtonDisabled}
			>
				{addButtonLabel}
			</IconButton>
		);

		const addToolTip = (
			<div className="properties-tooltips">
				{(tableButtonConfig && tableButtonConfig.addButtonTooltip) ? tableButtonConfig.addButtonTooltip
					: PropertyUtils.formatMessage(this.props.controller.getReactIntl(),
						MESSAGE_KEYS.STRUCTURETABLE_ADDBUTTON_TOOLTIP, MESSAGE_KEYS_DEFAULTS.STRUCTURETABLE_ADDBUTTON_TOOLTIP)}
			</div>
		);
		const removeToolTip = (
			<div className="properties-tooltips">
				{(tableButtonConfig && tableButtonConfig.removeButtonTooltip) ? tableButtonConfig.removeButtonTooltip
					: PropertyUtils.formatMessage(this.props.controller.getReactIntl(),
						MESSAGE_KEYS.STRUCTURETABLE_REMOVEBUTTON_TOOLTIP, MESSAGE_KEYS_DEFAULTS.STRUCTURETABLE_REMOVEBUTTON_TOOLTIP)}
			</div>
		);
		return (
			<div className="properties-at-buttons-container">
				<div className="properties-tooltips-container add-remove-columns">
					<Tooltip
						id={uuid4() + "-tooltip-remove-columns-" + this.props.control.name}
						tip={removeToolTip}
						direction="top"
						delay={TOOL_TIP_DELAY}
						className="properties-tooltips"
						disable={disabled}
					>
						{removeButton}
					</Tooltip>
				</div>
				<div className="properties-tooltips-container add-remove-columns">
					<Tooltip
						id={uuid4() + "-tooltip-add-columns-" + this.props.control.name}
						tip={addToolTip}
						direction="top"
						delay={TOOL_TIP_DELAY}
						className="properties-tooltips"
					>
						{addButton}
					</Tooltip>
				</div>
			</div>
		);
	}

	checkedAllValue(colIndex, checked) {
		const controlValue = this.props.value;
		for (let i = 0; i < controlValue.length; i++) {
			const propertyId = {
				name: this.props.control.name,
				row: i,
				col: colIndex
			};
			if (this.props.controller.getControlState(propertyId) !== STATES.DISABLED) {
				this.props.controller.updatePropertyValue(propertyId, checked);
			}
		}
		this.checkedAll[colIndex] = checked;
	}

	checkedAll(colIndex) {
		const controlValue = this.props.value;
		if (Array.isArray(controlValue)) {
			if (controlValue.length === 0) {
				return false;
			}
			for (let i = 0; i < controlValue.length; i++) {
				const propertyId = {
					name: this.props.control.name,
					row: i,
					col: colIndex
				};
				if (this.props.controller.getControlState(propertyId) !== STATES.DISABLED) {
					if (!controlValue[i][colIndex]) {
						return false;
					}
				}
			}
		} else {
			return false;
		}
		return true;
	}

	disabledAll(colIndex) {
		const controlValue = this.props.value;
		if (Array.isArray(controlValue)) {
			if (controlValue.length === 0) {
				return false;
			}
			for (const rowValue of controlValue) {
				if (rowValue[colIndex] === false) {
					return false;
				}
			}
		} else {
			return false;
		}
		return true;
	}

	createTable(tableState, tableButtonConfig) {
		const that = this;
		const rows = [];
		const sortFields = [];
		const filterFields = [];
		this.filterFields = filterFields;

		const headers = (this.props.control.header === false) ? [] : this.makeHeader(sortFields, filterFields);
		const showHeader = this.props.control.header !== false;

		const controlValue = this.props.value;
		this.makeCells(rows, controlValue, tableState);

		if (this.props.rightFlyout) {
			this.scrollToRow = null;
		}

		const selectedEditRow = this.props.control.rowSelection === "multiple-edit"
			? this.makeSelectedEditRow(this.props.selectedRows)
			: null;

		const topRightPanel = (typeof this.props.control.addRemoveRows === "undefined" || this.props.control.addRemoveRows) // default to true.
			? this.makeAddRemoveButtonPanel(tableState, tableButtonConfig)
			: <div />;

		const table =	(
			<FlexibleTable
				sortable={sortFields}
				filterable={filterFields}
				columns={headers}
				data={rows}
				showHeader={showHeader}
				scrollToRow={this.scrollToRow}
				alignTop={this.alignTop}
				onFilter={this.onFilter}
				onSort={this.onSort}
				topRightPanel={topRightPanel}
				selectedEditRow={selectedEditRow}
				scrollKey={this.props.control.name}
				tableState={tableState}
				messageInfo={this.props.controller.getErrorMessage(this.props.propertyId)}
				rows={this.props.control.rows}
				controller={this.props.controller}
			/>);
		setTimeout(function() {
			that.scrollToRow = null;
		}, 500);
		return (
			<div>
				{table}
			</div>
		);
	}

	makeHeader(sortFields, filterFields) {
		const headers = [];
		for (var j = 0; j < this.props.control.subControls.length; j++) {
			const columnDef = this.props.control.subControls[j];
			const checkboxName = this.props.control.name + j; // TODO might not be unique
			// See if the entire column is disabled
			const colState = this.props.controller.getControlState({ name: this.props.control.name, col: j });
			const disabled = colState === STATES.DISABLED || colState === STATES.HIDDEN;
			const columnLabel = (columnDef.controlType === ControlType.CHECKBOX)
				? (
					<Checkbox
						disabled={disabled}
						id={checkboxName}
						checked={this.checkedAll(j)}
						onChange={this.checkedAllValue.bind(this, j)}
						labelText={columnDef.label.text}
					/>) : columnDef.label.text;
			if (columnDef.visible) {
				if (columnDef.sortable) {
					sortFields.push(columnDef.name);
				}
				headers.push({
					"key": columnDef.name,
					"label": columnLabel,
					"width": columnDef.width,
					"description": (columnDef.description ? columnDef.description.text : null) });
				if (columnDef.filterable) {
					filterFields.push(columnDef.name);
				}
			}
		}
		if (this.props.control.childItem) {
			// set to specific size
			headers.push({ "key": "subpanel", "label": "", "width": TABLE_SUBPANEL_BUTTON_WIDTH });
		}
		// add extra column for overlay scrollbar
		headers.push({ "key": "scrollbar", "label": "", "width": TABLE_SCROLLBAR_WIDTH });
		return headers;
	}

	makeCells(rows, controlValue, tableState, propName, selectSummaryRow) {
		if (!Array.isArray(controlValue)) {
			return;
		}
		const propertyName = propName ? propName : this.props.control.name;
		for (let rowIndex = 0; rowIndex < controlValue.length; rowIndex++) {
			const columns = [];
			this.onPanelContainer[rowIndex] = [];
			if (this.includeInFilter(rowIndex)) {
				for (var colIndex = 0; colIndex < this.props.control.subControls.length; colIndex++) {
					const columnDef = this.props.control.subControls[colIndex];
					// we need to build the on-panel container so that when the row is selected and a not visible column is on-panel
					// the on-panel container will be available for display.
					if (columnDef.visible || columnDef.editStyle === EditStyle.ON_PANEL) {
						const content = this._makeCell(columnDef, controlValue, propertyName, rowIndex,
							colIndex, tableState, selectSummaryRow);
						// only add content if column is visible
						if (columnDef.visible) {
							columns.push(content);
						}
					}
				}
				if (this.props.control.childItem && !selectSummaryRow) {
					const cell = this.buildChildItem(propertyName, rowIndex, tableState);
					columns.push(cell);
				}
				// add padding for scrollbar
				columns.push({
					key: rowIndex + "-1-scrollbar",
					column: "scrollbar",
					width: TABLE_SCROLLBAR_WIDTH,
					content: <div />
				});
				rows.push({
					className: this.getRowClassName(rowIndex, selectSummaryRow),
					onClickCallback: this.handleRowClick.bind(this, rowIndex, selectSummaryRow),
					columns: columns
				});
			}
		}
	}

	buildChildItem(propName, rowIndex, tableState) {
		// Assumes the child item is an "ADDITIONAL_LINK" object.
		// However, we will extract information from the and will create our own Cell-based invoker.
		const propertyId = { name: propName, row: rowIndex };
		const subItemButton = this.props.buildUIItem(rowIndex, this.props.control.childItem, propertyId, this.indexOfColumn);
		// Hack to decompose the button into our own in-table link
		const subCell = (
			<div className="properties-table-subcell">
				<SubPanelCell
					label={subItemButton.props.label}
					title={subItemButton.props.title}
					panel={subItemButton.props.panel}
					iconName="gear"
					disabled={tableState === STATES.DISABLED}
					controller={this.props.controller}
					propertyId={this.props.propertyId}
					rightFlyout={this.props.rightFlyout}
				/>
			</div>);
		return {
			column: "subpanel",
			width: TABLE_SUBPANEL_BUTTON_WIDTH,
			content: subCell
		};
	}
}

AbstractTable.propTypes = {
	buildUIItem: PropTypes.func,
	control: PropTypes.object.isRequired,
	propertyId: PropTypes.object.isRequired,
	controller: PropTypes.object.isRequired,
	openFieldPicker: PropTypes.func.isRequired,
	rightFlyout: PropTypes.bool,
	value: PropTypes.array, // pass in by redux
	selectedRows: PropTypes.array // set by redux
};
