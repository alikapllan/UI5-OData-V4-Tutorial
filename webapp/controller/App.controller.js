sap.ui.define(
  [
    "sap/ui/core/Messaging",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Sorter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/FilterType",
  ],
  function (
    Messaging,
    Controller,
    JSONModel,
    MessageToast,
    MessageBox,
    Sorter,
    Filter,
    FilterOperator,
    FilterType
  ) {
    "use strict";

    return Controller.extend("sap.ui.core.tutorial.odatav4.controller.App", {
      /**
       *  Hook for initializing the controller
       */
      onInit() {
        let oMessageModel = Messaging.getMessageModel(),
          oMessageModelBinding = oMessageModel.bindList(
            "/",
            undefined,
            [],
            new Filter("technical", FilterOperator.EQ, true)
          ),
          oViewModel = new JSONModel({
            busy: false,
            hasUIChanges: false,
            usernameEmpty: true,
            order: 0,
          });

        this.getView().setModel(oViewModel, "appView");
        this.getView().setModel(oMessageModel, "message");

        oMessageModelBinding.attachChange(this.onMessageBindingChange, this);
        this._bTechnicalErrors = false;
      },

      onCreate() {
        let oList = this.byId("peopleList"),
          oBinding = oList.getBinding("items");

        const oContext = oBinding.create({
          UserName: "",
          FirstName: "",
          LastName: "",
          Age: "18",
        });

        this._setUIChanges();
        this.getView().getModel("appView").setProperty("/usernameEmpty", true);

        oList.getItems().some(function (oItem) {
          if (oItem.getBindingContext() === oContext) {
            oItem.focus();
            oItem.setSelected(true);
            return true;
          }
        });
      },

      onInputChange(oEvt) {
        if (oEvt.getParameter("escPressed")) {
          this._setUIChanges();
        } else {
          this._setUIChanges(true);
          if (
            oEvt
              .getSource()
              .getParent()
              .getBindingContext()
              .getProperty("UserName")
          ) {
            this.getView()
              .getModel("appView")
              .setProperty("/usernameEmpty", false);
          }
        }
      },

      onRefresh() {
        let oBinding = this.byId("peopleList").getBinding("items");

        if (oBinding.hasPendingChanges()) {
          MessageBox.error(this._getText("refreshNotPossibleMessage"));
          return;
        }
        oBinding.refresh();
        MessageToast.show(this._getText("refreshSuccessMessage"));
      },

      onSave() {
        const fnSuccess = () => {
          this._setBusy(false);
          MessageToast.show(this._getText("changesSentMessage"));
          this._setUIChanges(false);
        };

        const fnError = (oError) => {
          this._setBusy(false);
          this._setUIChanges(false);
          MessageBox.error(oError.message);
        };

        this._setBusy(true); // Lock UI until submitBatch is resolved.
        this.getView()
          .getModel()
          .submitBatch("peopleGroup")
          .then(fnSuccess, fnError);
        this._bTechnicalErrors = false; // If there were technical errors, a new save resets them.
      },

      onResetChanges() {
        this.byId("peopleList").getBinding("items").resetChanges();
        this._bTechnicalErrors = false;
        this._setUIChanges();
      },

      onSearch() {
        const oView = this.getView(),
          sValue = oView.byId("searchField").getValue(),
          oFilter = new Filter("LastName", FilterOperator.Contains, sValue);

        oView
          .byId("peopleList")
          .getBinding("items")
          .filter(oFilter, FilterType.Application);
      },

      onSort() {
        const oView = this.getView(),
          aStates = [undefined, "asc", "desc"],
          aStateTextIds = ["sortNone", "sortAscending", "sortDescending"];

        let iOrder = oView.getModel("appView").getProperty("/order"),
          sMessage;

        iOrder = (iOrder + 1) % aStates.length;
        const sOrder = aStates[iOrder];

        oView.getModel("appView").setProperty("/order", iOrder);
        oView
          .byId("peopleList")
          .getBinding("items")
          .sort(sOrder && new Sorter("LastName", sOrder === "desc"));

        sMessage = this._getText("sortMessage", [
          this._getText(aStateTextIds[iOrder]),
        ]);
        MessageToast.show(sMessage);
      },

      onMessageBindingChange(oEvent) {
        let aContexts = oEvent.getSource().getContexts(),
          aMessages,
          bMessageOpen = false;

        if (bMessageOpen || !aContexts.length) {
          return;
        }

        // Extract and remove the technical messages
        aMessages = aContexts.map((oContext) => {
          return oContext.getObject();
        });
        sap.ui.getCore().getMessageManager().removeMessages(aMessages);

        this._setUIChanges(true);
        this._bTechnicalErrors = true;

        MessageBox.error(aMessages[0].message, {
          id: "serviceErrorMessageBox",
          onClose: () => {
            bMessageOpen = false;
          },
        });

        bMessageOpen = true;
      },

      _getText(sTextId, aArgs) {
        return this.getOwnerComponent()
          .getModel("i18n")
          .getResourceBundle()
          .getText(sTextId, aArgs);
      },

      _setUIChanges(bHasUIChanges) {
        if (this._bTechnicalErrors) {
          // If there is currently a technical error, then force 'true'.
          bHasUIChanges = true;
        } else if (bHasUIChanges === undefined) {
          bHasUIChanges = this.getView().getModel().hasPendingChanges();
        }
        let oModel = this.getView().getModel("appView");
        oModel.setProperty("/hasUIChanges", bHasUIChanges);
      },

      _setBusy: function (bIsBusy) {
        var oModel = this.getView().getModel("appView");
        oModel.setProperty("/busy", bIsBusy);
      },
    });
  }
);
