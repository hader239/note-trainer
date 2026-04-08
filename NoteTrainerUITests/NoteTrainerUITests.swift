import XCTest

final class NoteTrainerUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testPrimaryFlowHomeToTrainingAndSettings() throws {
        let app = XCUIApplication()
        app.launchArguments += ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        app.launch()

        XCTAssertTrue(app.staticTexts["Note Trainer"].waitForExistence(timeout: 5))

        let modeButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Note Reading")
        ).firstMatch
        XCTAssertTrue(modeButton.waitForExistence(timeout: 5))
        modeButton.tap()

        XCTAssertTrue(app.staticTexts["Identify the note on the staff."].waitForExistence(timeout: 5))

        let cButton = app.buttons["C"]
        XCTAssertTrue(cButton.waitForExistence(timeout: 5))
        cButton.tap()

        let endButton = app.buttons["End"]
        XCTAssertTrue(endButton.waitForExistence(timeout: 3))
        endButton.tap()

        XCTAssertTrue(app.staticTexts["Training Modes"].waitForExistence(timeout: 5))

        let settingsButton = app.buttons["Settings"]
        XCTAssertTrue(settingsButton.waitForExistence(timeout: 3))
        settingsButton.tap()

        XCTAssertTrue(app.staticTexts["Settings"].waitForExistence(timeout: 5))
    }
}
