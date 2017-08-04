/*******************************************************************************
 * Licensed Materials - Property of IBM
 * (c) Copyright IBM Corporation 2017. All Rights Reserved.
 *
 * Note to U.S. Government Users Restricted Rights:
 * Use, duplication or disclosure restricted by GSA ADP Schedule
 * Contract with IBM Corp.
 *******************************************************************************/
 /* eslint no-console: "off" */

import log4js from "log4js";
import deepFreeze from "deep-freeze";
import { expect } from "chai";
import _ from "underscore";
import initialCanvas from "./test_resources/json/startCanvas.json";
import paletteJson from "../../harness/test_resources/palettes/modelerPalette.json";
import filterNode from "./test_resources/json/filterNode.json";
import horizontalLayoutCanvas from "./test_resources/json/horizontalLayoutCanvas.json";
import verticalLayoutCanvas from "./test_resources/json/verticalLayoutCanvas.json";
import addNodeHorizontalLayoutCanvas from "./test_resources/json/addNodeHorizontalLayoutCanvas.json";
import addNodeVerticalLayoutCanvas from "./test_resources/json/addNodeVerticalLayoutCanvas.json";
import moveVarNode from "./test_resources/json/moveVarNode.json";
import moveNodeHorizontalLayoutCanvas from "./test_resources/json/moveNodeHorizontalLayoutCanvas.json";
import moveNodeVerticalLayoutCanvas from "./test_resources/json/moveNodeVerticalLayoutCanvas.json";


import ObjectModel from "../src/object-model/object-model.js";
import { NONE, VERTICAL, HORIZONTAL } from "../constants/common-constants.js";

const logger = log4js.getLogger("object-model-test");

describe("ObjectModel API handle model OK", () => {

	it("should layout a canvas horiziontally", () => {
		logger.info("should layout a canvas horiziontally");

		const startCanvas = initialCanvas;

		deepFreeze(startCanvas);

		ObjectModel.setCanvas(startCanvas);
		ObjectModel.fixedAutoLayout(HORIZONTAL);
		ObjectModel.setPaletteData(paletteJson);
		const node = ObjectModel.createNode(filterNode);
		ObjectModel.addNode(node);

		const expectedCanvas = addNodeHorizontalLayoutCanvas;
		const actualCanvas = ObjectModel.getCanvas();

		// Delete ID because IDs are generated at runtime and therefore won't be
		// the same between expected and actual.
		delete actualCanvas.diagram.nodes[3].id;

		expect(_.isEqual(expectedCanvas, actualCanvas)).to.be.true;

	});

	it("should layout a canvas vertically", () => {
		logger.info("should layout a canvas vertically");

		const startCanvas = initialCanvas;

		deepFreeze(startCanvas);

		ObjectModel.setCanvas(startCanvas);
		ObjectModel.fixedAutoLayout(VERTICAL);
		ObjectModel.setPaletteData(paletteJson);
		const node = ObjectModel.createNode(filterNode);
		ObjectModel.addNode(node);

		const expectedCanvas = addNodeVerticalLayoutCanvas;
		const actualCanvas = ObjectModel.getCanvas();

		// Delete ID because IDs are generated at runtime and therefore won't be
		// the same between expected and actual.
		delete actualCanvas.diagram.nodes[3].id;

		expect(_.isEqual(expectedCanvas, actualCanvas)).to.be.true;
	});

	it("should oneTimeLayout a canvas horiziontally", () => {
		logger.info("should oneTimeLayout a canvas horiziontally");

		const startCanvas = initialCanvas;

		deepFreeze(startCanvas);

		ObjectModel.setCanvas(startCanvas);
		ObjectModel.autoLayout(HORIZONTAL);

		const expectedCanvas = horizontalLayoutCanvas;

		const actualCanvas = ObjectModel.getCanvas();

		expect(_.isEqual(expectedCanvas, actualCanvas)).to.be.true;

	});

	it("should oneTimeLayout a canvas vertically", () => {
		logger.info("should oneTimeLayout a canvas vertically");

		const startCanvas = initialCanvas;

		deepFreeze(startCanvas);

		ObjectModel.setCanvas(startCanvas);
		ObjectModel.autoLayout(VERTICAL);

		const expectedCanvas = verticalLayoutCanvas;

		const actualCanvas = ObjectModel.getCanvas();

		expect(_.isEqual(expectedCanvas, actualCanvas)).to.be.true;
	});

	it("should move a node after oneTimeLayout horiziontally", () => {
		logger.info("should move a node after oneTimeLayout horiziontally");

		const startCanvas = initialCanvas;

		deepFreeze(startCanvas);

		ObjectModel.setCanvas(startCanvas);
		ObjectModel.fixedLayout = NONE;
		ObjectModel.autoLayout(HORIZONTAL);

		ObjectModel.moveObjects(moveVarNode);

		const expectedCanvas = moveNodeHorizontalLayoutCanvas;
		const actualCanvas = ObjectModel.getCanvas();

		expect(_.isEqual(expectedCanvas, actualCanvas)).to.be.true;
	});

	it("should move a node after oneTimeLayout vertically", () => {
		logger.info("should move a node after oneTimeLayout vertically");

		const startCanvas = initialCanvas;

		deepFreeze(startCanvas);

		ObjectModel.setCanvas(startCanvas);
		ObjectModel.autoLayout(VERTICAL);

		ObjectModel.moveObjects(moveVarNode);


		const expectedCanvas = moveNodeVerticalLayoutCanvas;
		const actualCanvas = ObjectModel.getCanvas();

		expect(_.isEqual(expectedCanvas, actualCanvas)).to.be.true;
	});

});
