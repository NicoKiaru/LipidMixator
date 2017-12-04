// TODO:
// memoization ?
// Add small images
// Summary of lipid types
// Check problem confusion + = string concatenantion or numeric operation
// Needs : user definition + names adding + saving of mix + simple export (pdf for instance, or print button)
// Add more Avanti references / tutorial and stored mixes
// Add markdown editor

Tabulator.extendExtension("mutator", "mutators", {
    parser:function(value, data, type, mutatorParams){
		/*if (data.MW!=undefined) {
			alert(data.MW);
			alert(value);
		}*/
        return eval(value);//value;
    },
});

Tabulator.extendExtension("validate", "validators", {
    computable_numeric:function(cell, value, parameters){
       //cell - the cell component for the edited cell
       //value - the new input value of the cell
       //parameters - the parameters passed in with the validator
       return jQuery.isNumeric(eval(value)); //Hope it is safe
    },
});

Tabulator.extendExtension("format", "formatters", {
    boldLockLipid:function(cell, formatterParams){
        if (cell.getValue()==undefined) return "undef";
        var lipid = cell.getData();
        toDisplay = cell.getValue();
        if (jQuery.isNumeric(cell.getValue())) {toDisplay = Number(cell.getValue()).toPrecision(4);}
        //alert(cell.getField()+":"+lipidPropertyIsLocked(lipid,cell.getField()));
        if (lipidPropertyIsLocked(lipid,cell.getField())) {
          return "<strong>" +toDisplay+ "</strong>"; //make the contents of the cell bold
        } else {
          return toDisplay; //make the contents of the cell bold
        }
    },
    boldLockGlobalParam:function(cell, formatterParams){
        if (cell.getValue()==undefined) return "undef";
        var globalParams = cell.getData();
        toDisplay = cell.getValue();
        if (jQuery.isNumeric(toDisplay)) {toDisplay = Number(toDisplay).toPrecision(4);}
        if (globalPropertyIsLocked(globalParams,cell.getField())|| cell.getField()=='vol') {
          return "<strong>" + toDisplay + "</strong>"; //make the contents of the cell bold
        } else {
          return toDisplay; //make the contents of the cell bold
        }
    },
    precision4: function(cell, formatterParams){
        toDisplay = cell.getValue();
        if (toDisplay==undefined) return "undef";
        if (jQuery.isNumeric(toDisplay)) {toDisplay = Number(toDisplay).toPrecision(4);}
        return toDisplay; //make the contents of the cell bold
    },
    linkLipidSrc:function(cell, formatterParams){
        lipid = cell.getData();
        extRef = lipidHelper[lipid.src].getExternalLink(lipid.id);
        return "<a target='_blank' href='"+extRef+"'>"+cell.getValue()+"</a>";
    }
});

function lipidPropertyIsLocked(lipid,property) {
    if ((property == lipid.stockPropertyLocked) || (property == lipid.mixPropertyLocked)) {
       return true;
    } else {
       return false;
    }
}

function globalPropertyIsLocked(data,property) {
    if (data.propertyLocked == 'cmass') {
       return (property =='cmass') || (property =='vol');
    }
    if (data.propertyLocked == 'cmol') {
       return (property =='cmol') || (property =='vol');
    }
    // else
    return (property==data.propertyLocked);
}

var lipidNameEditor = function(cell, onRendered, success, cancel){
    //cell - the cell component for the editable cell
    //onRendered - function to call when the editor has been rendered
    //success - function to call to pass the succesfully updated value to Tabulator
    //cancel - function to call to abort the edit and return to a normal cell

	var lipidEdited = cell.getRow().getData();
	var lipidNames = getNamesOfLipid(cell.getRow().getData()).slice();

	if (lipidEdited.src=="CUSTOM") { // Custom lipid names can be changed
		lipidNames.push("custom...");
	}

	editorTxt = "<select>";
	for (index in lipidNames) {
		name = lipidNames[index];
		//alert(name);
		editorTxt+="<option value='"+index+"'>"+name+"</option>";
	}
	editorTxt +="</select>";

    var editor = $(editorTxt);
    editor.css({
        "padding":"3px",
        "width":"100%",
        "box-sizing":"border-box",
    });

    //Set value of editor to the current value of the cell
    editor.val(cell.getValue());

    //set focus on the select box when the editor is selected (timeout allows for editor to be added to DOM)
    onRendered(function(){
	  editor.focus();
      editor.css("height","100%");
    });

    //when the value has been set, trigger the cell to update
    editor.on("change blur", function(e){
		// Stores the preferred name
		lipidPropertyKey = getLipidPropertyKey(getLipidKey(lipidEdited),"lipidNameIndex");
		newName = lipidNames[editor.val()]
		if (lipidNames[editor.val()]=="custom...") { // if custom -> retrieve a custom name
			var customName = prompt("Please enter the lipid name you want to use :", "custom_lipid");
			localStorage.setItem(lipidPropertyKey, -1);
			lipidPropertyKey = getLipidPropertyKey(getLipidKey(lipidEdited),"name");
			localStorage.setItem(lipidPropertyKey, customName);
			newName = customName;
		} else {
			localStorage.setItem(lipidPropertyKey, editor.val());
		}
        success(newName);
    });

    //return the editor element
    return editor;
};


$("#lipidmixglobal-table").tabulator({
  layout:"fitColumns", //fit columns to width of table (optional)
  movableRows:true,
  columns:[
	{title:"Name",field:"mixName",editor:"input"},
    {title:"Volume (ml)",field:"vol",formatter:"boldLockGlobalParam",editor:"input", validator:"computable_numeric", mutator:"parser"},
	{title:"Solvent to add (ml)",field:"volSol",formatter:"boldLockGlobalParam"},
    {title:"Mass (mg)",field:"mass",formatter:"boldLockGlobalParam",editor:"input", validator:"computable_numeric", mutator:"parser"},
    {title:"Mol (µmol)",field:"mol",formatter:"boldLockGlobalParam",editor:"input", validator:"computable_numeric", mutator:"parser"},
    {title:"[] (mg/mL)",field:"cmass",formatter:"boldLockGlobalParam",editor:"input", validator:"computable_numeric", mutator:"parser"},
    {title:"[] (µmol/mL)",field:"cmol",formatter:"boldLockGlobalParam",editor:"input", validator:"computable_numeric", mutator:"parser"},
  ],
  cellEdited:function(cell){
      globalParams = cell.getData();
      propertyEdited = cell.getColumn().getField();
      if (!globalPropertyIsLocked(globalParams,propertyEdited)) {
         // that's a change
        if (propertyEdited=='vol') {
          if (globalParams.propertyLocked=='mol') {
             globalParams.propertyLocked='cmol';
          } else {
             globalParams.propertyLocked='cmass';
          }
        }
		else {
			if (propertyEdited!="mixName") {
				globalParams.propertyLocked = propertyEdited;
			}
        }
      }
      cell.getRow().update(globalParams);
      reComputeAll();
  },
});

globalMixParams={};
iniGlobalMixParams();

function getMixName() {
	var globalData = $("#lipidmixglobal-table").tabulator("getData")[0];
	return globalData.mixName;
}

function setMixName(newName) {
	var globalData = $("#lipidmixglobal-table").tabulator("getData")[0];
	globalData.mixName=newName;
	$("#lipidmixglobal-table").tabulator("updateData", [globalData]);
}

$(document).ready(function(){
	//trigger download of data.csv file
	$("#download-csv").click(function(){
		$("#lipidmix-table").tabulator("download", "csv", getMixName()+".csv");
	});

	//trigger download of data.json file
	$("#download-json").click(function(){
		$("#lipidmix-table").tabulator("download", "json", getMixName()+".json");
	});

	document.getElementById('import').onclick = function() {
		var files = document.getElementById('selectFiles').files;
		console.log(files);
		if (files.length <= 0) {
			alert("Please select a file before importing it.");
			return false;
		}
		var fr = new FileReader();
		fr.onload = function(e) {
			console.log(e);
			var result = JSON.parse(e.target.result);
			fname=files.item(0).name;
			trimed_filename = fname.substring(0, fname.lastIndexOf('.'));
			setMixName(trimed_filename);
			$("#lipidmix-table").tabulator("setData", result);
			reComputeAll();
			//var formatted = JSON.stringify(result, null, 2);
			//document.getElementById('result').value = formatted;
		}
		fr.readAsText(files.item(0));
	};

	mixToOpen = findGetParameter("mixName");
	/*
	if (mixToOpen!=undefined) {
		alert(mixToOpen);
		/*$.ajax({
			dataType: "json",
			url: "mixes/"+mixToOpen+".json",
			data: data,
			success: success
		});*/
		/*
		$.getJSON( "mixes/"+mixToOpen+".json", function( json ) {
			console.log( "JSON Data: " + json );
		});*/

	//}

});

function iniGlobalMixParams() {
  globalMixParams.mixName='MyMix';
  globalMixParams.vol=1;
  globalMixParams.mass=1;
  globalMixParams.mol=undefined;
  globalMixParams.cmass=1;
  globalMixParams.cmol=undefined;
  globalMixParams.propertyLocked = 'cmass'; // default
  // Mode : vol + concentration locked, then either cmass or cmol is locked
  // Mode : quantity locked, then either mass or mol is locked
  $("#lipidmixglobal-table").tabulator("addData",globalMixParams);
}

$("#lipidmix-table").tabulator({
    //height:605, // set height of table, this enables the Virtual DOM and improves render speed dramatically (can be any valid css height value)
     //layout:"fitColumns", //fit columns to width of table (optional)
	  movableRows:true,
    //history:true,
    keybindings:{
      "navDown" : 9, // tab moves to lipid below
      "navNext" : false,
    },//
    columns:[ //Define Table Columns
        {rowHandle:true, formatter:"handle", headerSort:false, width:30, minWidth:30},
        {title:"Lipid",
          columns:[
            {formatter:"buttonCross", width:40, align:"center",
                      cellClick:function(e, cell){
                         $("#lipidmix-table").tabulator("deleteRow", cell.getRow());
                         reComputeAll();
                      }
            },
            {title:"DB", field:"src", formatter:"linkLipidSrc", width:100},
            {title:"ID-L", field:"id", formatter:"linkLipidSrc"},
            {title:"Name", field:"name", editor:lipidNameEditor},
            {title:"MW (g/mol)", field:"MW", editor:"input", formatter:"precision4", validator:"computable_numeric", mutator:"parser", align:"left"},
          ],
        },
        {
          title:"Stock []",
          columns:[
            {title:"g/L", field:"stockConcentration_g_l", editor:"input", formatter:"boldLockLipid", mutator:"parser", validator:"computable_numeric", align:"left"},
            {title:"mmol/L", field:"stockConcentration_m_l", editor:"input", formatter:"boldLockLipid", mutator:"parser", validator:"computable_numeric", align:"left"},
          ]
        },
        {
          title:"Mix",
          columns:[
            {title:"Molar ratio", field:"molarRatioInMix", align:"left", formatter:"boldLockLipid", mutator:"parser", editor:"input", validator:"computable_numeric"},
            {title:"mg", field:"massInMix", align:"left", editor:"input", formatter:"boldLockLipid", mutator:"parser", validator:"computable_numeric"},
            {title:"µmol", field:"molInMix", align:"left", editor:"input", formatter:"boldLockLipid", mutator:"parser", validator:"computable_numeric"},//,
            {title:"µL of stock", field:"volInMix", align:"left", editor:"input", formatter:"boldLockLipid", mutator:"parser", validator:"computable_numeric"},//,
          ]
        },
    ],
    cellEdited:function(cell){
        //cell - cell component
        lipidEdited = cell.getRow().getData();
        propertyEdited = cell.getColumn().getField();
        lipidPropertyChanged(lipidEdited,propertyEdited,lipidEdited[propertyEdited],true);
        cell.getRow().update(lipidEdited);
        reComputeAll();
    },
});

function reComputeAll() {
  // Fetch global data
  var globalData = $("#lipidmixglobal-table").tabulator("getData")[0]; // only one line
  var mixData = $("#lipidmix-table").tabulator("getData");
  var totalMass;
  if ((globalData.propertyLocked=='cmass')||(globalData.propertyLocked=='mass')) {
      var totalMass = 0;
	  if ((globalData.propertyLocked=='cmass')) {
		 totalMass = globalData.vol*globalData.cmass; // result in mg : global data.vol in ml, global data.cmass in mg/ml
	  } else {
		 totalMass = globalData.vol*globalData.mass; // result in mg : global data.vol in ml, global data.cmass in mg/ml
	  }
      // needs to fit with these constrains
      // First look for already locked mass
      var lockedMass=0;
      var lockedMol=0;
      var totalWeightRatio = 0;
      var avgMW = 0;
      // mass in ug, and mol in umol
      for (index in mixData) {
        lipid = mixData[index];
        if (lipid.mixPropertyLocked=='massInMix') {
          lipid.molInMix = lipid.massInMix / lipid.MW * 1e3; // mol in umol
          lipid.volInMix = lipid.massInMix/lipid.stockConcentration_g_l * 1e3; // vol in ul
          lockedMol+=1*lipid.molInMix;
          lockedMass+=1*lipid.massInMix;
        } else if (lipid.mixPropertyLocked=='molInMix') {
          lipid.massInMix = lipid.molInMix * lipid.MW / 1e3; // mass in mg
          lipid.volInMix = lipid.massInMix/lipid.stockConcentration_g_l * 1e3; // vol in ul²
          lockedMol+=1*lipid.molInMix;
          lockedMass+=1*lipid.massInMix;
        } else if (lipid.mixPropertyLocked=='volInMix') {
          lipid.massInMix = lipid.volInMix*lipid.stockConcentration_g_l / 1e3; // mass in mg
          lipid.molInMix = lipid.massInMix / lipid.MW * 1e3;  // mol in umol
          lockedMol+=1*lipid.molInMix;
          lockedMass+=1*lipid.massInMix;
        } else {
          // molarRatioInMix is locked
          totalWeightRatio +=1*lipid.molarRatioInMix; // numeric conversion
          avgMW+=lipid.MW*lipid.molarRatioInMix;
        }
      }
      lockedMass = lockedMass; // in mg
      lockedMol = lockedMol;
      var remainingMass = totalMass-lockedMass;
      var remainingMol =0;
      var totalMol = lockedMol;
      if (totalWeightRatio!=0) {
        avgMW = avgMW/totalWeightRatio;
        remainingMol = remainingMass/avgMW;
        totalMol += remainingMol;
        totalWeightRatio = (remainingMol+lockedMol)*totalWeightRatio/remainingMol/1e3;
      } else {
        totalWeightRatio=100;
      }
      //Let's reput all ok:
      //globalData.vol
	  globalMass=0;
	  globalMol=0;
	  globalVol=0;
      for (index in mixData) {
        lipid = mixData[index];
        if ((lipid.mixPropertyLocked=='massInMix')||(lipid.mixPropertyLocked=='molInMix')||(lipid.mixPropertyLocked=='volInMix')) {
          lipid.molarRatioInMix = lipid.molInMix/totalMol*totalWeightRatio;
        } else {
          lipid.molInMix = totalMol*lipid.molarRatioInMix/totalWeightRatio;
          lipid.massInMix = lipid.molInMix * lipid.MW / 1e3;
          lipid.volInMix = lipid.massInMix/lipid.stockConcentration_g_l * 1e3;
        }
		globalMass+=lipid.massInMix;
		globalMol+=lipid.molInMix;
		globalVol+=lipid.volInMix;
      }

	  globalData.mass=globalMass;
	  globalData.mol=globalMol;
	  globalData.cmol=globalData.mol/globalData.vol;
	  globalData.cmass=globalData.mass/globalData.vol;
	  globalData.volSol=globalData.vol-globalVol/1e3;
	  $("#lipidmixglobal-table").tabulator("updateData", [globalData]);
      $("#lipidmix-table").tabulator("updateData",mixData);
  }

   if ((globalData.propertyLocked=='cmol')||(globalData.propertyLocked=='mol')) {
	   var totalMol=0;
	   if ((globalData.propertyLocked=='cmol')) {
		 totalMol = globalData.vol*globalData.cmol; // result in mg : global data.vol in ml, global data.cmass in mg/ml
	   } else {
		 totalMol = globalData.vol*globalData.mol; // result in mg : global data.vol in ml, global data.cmass in mg/ml
	   }
      // result in µmol
      // needs to fit with these constrains
      // First look for already locked mol
      var lockedMol=0;
      var totalWeightRatio = 0;
      var avgMW = 0;
      // mass in ug, and mol in umol
      for (index in mixData) {
        lipid = mixData[index];
        if (lipid.mixPropertyLocked=='massInMix') {
          lipid.molInMix = lipid.massInMix / lipid.MW * 1e3;
          lipid.volInMix = lipid.massInMix/lipid.stockConcentration_g_l * 1e3;
          lockedMol+=1*lipid.molInMix;
        } else if (lipid.mixPropertyLocked=='molInMix') {
          lipid.massInMix = lipid.molInMix * lipid.MW / 1e3;
          lipid.volInMix = lipid.massInMix/lipid.stockConcentration_g_l* 1e3;
          lockedMol+=1*lipid.molInMix;
        } else if (lipid.mixPropertyLocked=='volInMix') {
          lipid.massInMix = lipid.volInMix*lipid.stockConcentration_g_l / 1e3;
          lipid.molInMix = lipid.massInMix / lipid.MW * 1e3 ;
          lockedMol+=1*lipid.molInMix;
        } else {
          // molarRatioInMix is locked
          totalWeightRatio +=1*lipid.molarRatioInMix; // numeric conversion
          avgMW+=lipid.MW*lipid.molarRatioInMix;
        }
      }
      var remainingMol = 1*totalMol - 1*lockedMol;
      if (totalWeightRatio!=0) {
        avgMW = avgMW/totalWeightRatio;
        totalWeightRatio = totalWeightRatio*(totalMol/remainingMol);
      } else {
        totalWeightRatio=100;
      }
	  globalMass=0;
	  globalMol=0;
	  globalVol=0;
	  for (index in mixData) {
        lipid = mixData[index];
        if ((lipid.mixPropertyLocked=='massInMix')||(lipid.mixPropertyLocked=='molInMix')||(lipid.mixPropertyLocked=='volInMix')) {
          lipid.molarRatioInMix = lipid.molInMix/totalMol*totalWeightRatio;// / 1e3;
        } else {
          lipid.molInMix = totalMol*lipid.molarRatioInMix/totalWeightRatio;
          lipid.massInMix = lipid.molInMix * lipid.MW / 1e3;
          lipid.volInMix = lipid.massInMix/lipid.stockConcentration_g_l * 1e3;
        }
		globalMass+=lipid.massInMix;
		globalMol+=lipid.molInMix;
		globalVol+=lipid.volInMix;
      }
	  globalData.mass=globalMass;
	  globalData.mol=globalMol;
	  globalData.cmol=globalData.mol/globalData.vol;
	  globalData.cmass=globalData.mass/globalData.vol;
	  globalData.volSol=globalData.vol-globalVol/1e3;
	  $("#lipidmixglobal-table").tabulator("updateData", [globalData]);
      $("#lipidmix-table").tabulator("updateData",mixData);

  }
  $("#lipidmixglobal-table").tabulator("redraw");//, true);
  $("#lipidmix-table").tabulator("redraw");//, true);
}



function lipidPropertyChanged(lipid,property,value,isUserModification) {
  //lipid : "+lipidEdited.name+" has property + "+cell.getColumn().getField()+" edited."
  lipidPropertyKey = getLipidPropertyKey(getLipidKey(lipid),property);
  if (storeInLocalStorage[property]&&(isUserModification)) {
     localStorage.setItem(lipidPropertyKey, value);
  }
  // --------------------- Lipid MW and Stock concentration consistency
  // Preferential set parameter : stockConcentration_g_l
  // Priority : keep MW constant
  // If MW changed : keep stockConcentration_g_l constant
  //'stockPropertyLocked', 'mixPropertyLocked'
  if (lipid.MW!=0) {
    if (property=='stockConcentration_g_l') {
        lipid.stockConcentration_m_l =  value / lipid.MW * 1e3;
        lipid.stockPropertyLocked=property;
        lipidPropertyKey = getLipidPropertyKey(getLipidKey(lipid),'stockPropertyLocked');
        localStorage.setItem(lipidPropertyKey, 'stockConcentration_g_l');
    }
    if (property=='stockConcentration_m_l') {
        lipid.stockConcentration_g_l =  value * lipid.MW / 1e3;
        lipid.stockPropertyLocked=property;
        // remember new value of concentration as well
        lipidPropertyKey = getLipidPropertyKey(getLipidKey(lipid),'stockConcentration_g_l');
        localStorage.setItem(lipidPropertyKey, lipid.stockConcentration_g_l);
        lipidPropertyKey = getLipidPropertyKey(getLipidKey(lipid),'stockPropertyLocked');
        localStorage.setItem(lipidPropertyKey, 'stockConcentration_m_l');
    }
    if (property=='MW') {
        if ((lipid.stockPropertyLocked) == 'stockConcentration_g_l') {
          lipid.stockConcentration_m_l =  lipid.stockConcentration_g_l / lipid.MW * 1e3;
          lipid.stockConcentration_g_l =  lipid.stockConcentration_m_l * lipid.MW / 1e3;
        } else {
          lipid.stockConcentration_g_l =  lipid.stockConcentration_m_l * lipid.MW / 1e3;
          lipid.stockConcentration_m_l =  lipid.stockConcentration_g_l / lipid.MW * 1e3;
        }
    }
  }
  // ---------------------- Lipid mix consistency
  // Preferential set parameter : molarRatioInMix
  if ((property=='molarRatioInMix')||(property=='massInMix')
    ||(property=='molInMix')||(property=='volInMix')) {
      lipid.mixPropertyLocked = property;
  }
  return lipid;
}

var lipidPropertyList = ['name','MW','stockConcentration_g_l',
                         'molarRatioInMix', 'massInMix', 'molInMix', 'volInMix',
                         'stockPropertyLocked', 'mixPropertyLocked'];

// reverse autocompletion datasets for easier access
lipid_list={};

for (lipidIndex in autocomplete_lipid_list) {
    lipid = autocomplete_lipid_list[lipidIndex];
    names = lipid.value.split('|');
    lipidSrc = lipid.data.source;
    lipidId = lipid.data.id;
    lipidKey=lipidSrc+'-'+lipidId;
    lipid_list[lipidKey]={};
    lipid_list[lipidKey].src=lipidSrc;
    lipid_list[lipidKey].id=lipidId;
    lipid_list[lipidKey].names=names;
    if (lipid.data.mw != undefined) {
      lipid_list[lipidKey].mw=lipid.data.mw;
    }
}

function supports_html5_storage() {
  try {
    return 'localStorage' in window && window['localStorage'] !== null;
  } catch (e) {
    return false;
  }
}

var localStorageSupported = supports_html5_storage();

function getLipidKey(lipid) {
  return lipid.src+'-'+lipid.id;
}

function getLipidPropertyKey(lipidKey, property) {
  return lipidKey+'-'+property;
}

function getLipidSrcAndId(lipidKey) {
  a = lipidKey.split('-');
  src = a.shift();
  id = a.join('-');
  return [src,id];
}

function initLipidProperty(property,lipidKey,lookInLocalStorage,crossRefIndex = -1) {
  ans = undefined;
  // Look first in local storage if something is there
  if ((lookInLocalStorage)&&(localStorageSupported)) {
      testedKey = getLipidPropertyKey(lipidKey,property);
      testGetLocal = localStorage.getItem(testedKey);
      //alert(testedKey);
      if (testGetLocal!=undefined) {
        return testGetLocal;
      }
      //testedKey+" not found in local storage");
  }
  [src,id] = getLipidSrcAndId(lipidKey);
  if (lipidHelper[src]!=undefined) {
     if (lipidHelper[src].getProperty!=undefined) {
       if (lipidHelper[src].getProperty[property] != undefined) {
         returnedVar = lipidHelper[src].getProperty[property](lipidKey);
         if (returnedVar!=undefined) {
           return returnedVar;
         }
       }
     }
  }
  if (crossRefIndex!=-1) {
     alternativeKeys = lipid_cross_refs[crossRefIndex];
     indexKey=0;
     while ((ans == undefined)&&(indexKey<alternativeKeys.length)) {
        ans = initLipidProperty(property,alternativeKeys[indexKey],false);
        indexKey=indexKey+1;
     }
  }
  if (ans==undefined) {
     if (lipidDefaultPropertyValue[property]!=undefined) {
       ans = lipidDefaultPropertyValue[property];
     }
  }
  return ans;
}

lipidDefaultPropertyValue = {};
lipidDefaultPropertyValue.molarRatioInMix=0;

var lipidHelper = {};

function getNameFromLipidList(lipidKey) {
	lipidPropertyKey = getLipidPropertyKey(lipidKey,"lipidNameIndex");
	nameIndex=0; // default
    testGetLocal = localStorage.getItem(lipidPropertyKey);
    //alert(testedKey);
    if (testGetLocal!=undefined) {
        nameIndex = testGetLocal;
    }
	if (nameIndex==-1) {
		if (lipidKey.startsWith("CUSTOM")) {
			if 	(localStorage.getItem(getLipidPropertyKey(lipidKey,"name"))!=undefined) {
				nameOut = localStorage.getItem(getLipidPropertyKey(lipidKey,"name"));//getLipidPropertyKey(lipidKey,"name");
			}
		}
	} else {
		nameOut = lipid_list[lipidKey].names[nameIndex];
	}
    return nameOut;
}

function getNamesOfLipid(lipid) {
	var lipidKey = getLipidKey(lipid);
	return lipid_list[lipidKey].names;
}

function getMWFromLipidList(lipidKey) {
  return lipid_list[lipidKey].mw;
}


// Source = AVANTI
avantiKey = 'AVANTI';
lipidHelper[avantiKey] = { getProperty:{}};
lipidHelper[avantiKey].getProperty['name'] = getNameFromLipidList;
lipidHelper[avantiKey].getProperty['MW'] = getMWFromLipidList;
lipidHelper[avantiKey].getExternalLink = function (lipidId) {
      return "https://avantilipids.com/product/"+lipidId+"/";
}

mapsKey = 'MAPS';
lipidHelper[mapsKey] = { getProperty:{}};
lipidHelper[mapsKey].getProperty['name'] = getNameFromLipidList;
lipidHelper[mapsKey].getProperty['MW'] = getMWFromLipidList;
lipidHelper[mapsKey].getExternalLink = function (lipidId) {
      return "http://www.lipidmaps.org/data/LMSDRecord.php?LMID="+lipidId;
}

echelonKey='ECHELON';
lipidHelper[echelonKey] = { getProperty:{}};
lipidHelper[echelonKey].getProperty['name'] = getNameFromLipidList;
lipidHelper[echelonKey].getProperty['MW'] = getMWFromLipidList;
lipidHelper[echelonKey].getExternalLink = function (lipidId) {
      // cannot find quick link -> for google
      return "http://www.google.com/search?q=site:echelon-inc.com+"+lipidId;
}

attotecKey='ATTOTEC';
lipidHelper[attotecKey] = { getProperty:{}};
lipidHelper[attotecKey].getProperty['name'] = getNameFromLipidList;
lipidHelper[attotecKey].getProperty['MW'] = getMWFromLipidList;
lipidHelper[attotecKey].getExternalLink = function (lipidId) {
      // cannot find quick link -> for google
      return "http://www.google.com/search?q=site:atto-tec.com+"+lipidId;
}

customKey='CUSTOM';
lipidHelper[customKey] = { getProperty:{}};
lipidHelper[customKey].getProperty['name'] = getNameFromLipidList;
lipidHelper[customKey].getProperty['MW'] = getMWFromLipidList;
lipidHelper[customKey].getExternalLink = function (lipidId) {
      // no external link with custom lipids
      return "";
}

eeggKey='EEGG';
lipidHelper[eeggKey] = { getProperty:{}};
lipidHelper[eeggKey].getProperty['name'] = getNameFromLipidList;
lipidHelper[eeggKey].getProperty['MW'] = getMWFromLipidList;
lipidHelper[eeggKey].getExternalLink = function (lipidId) {
      // no external link with custom lipids
      return "https://fr.wikipedia.org/wiki/+"+lipidId;
}

// Lipid autocompletion
$('#autocomplete_lipids').devbridgeAutocomplete({//autocomplete({
    lookup: autocomplete_lipid_list,
    lookupLimit: 100,
    minChars: 2,
    autoSelectFirst: true,
    showNoSuggestionNotice: true,
    groupBy:'source',
    noSuggestionNotice:'No result.',
    onSelect: function (suggestion) {
        addLipidToMix(suggestion.data['source'],suggestion.data['id']);
        $('#autocomplete_lipids').val('');
    }
});

function addToTableMix(lipid) {
    $("#lipidmix-table").tabulator("addData",lipid);
    reComputeAll();
}

function findCrossRef(lipidKey) {
  // stupid exhaustive search
  for (index in lipid_cross_refs) {
      current_cross_ref = lipid_cross_refs[index];
      for (indexRef in current_cross_ref) {
         if (current_cross_ref[indexRef]==lipidKey) {
            return index;
         }
      }
  }
  return -1;
}

var storeInLocalStorage = {
        'name':false,
        'MW':false,
        'stockConcentration_g_l':true,
        'molarRatioInMix':true,
        'stockPropertyLocked':true,
        'mixPropertyLocked':true,
}

function findGetParameter(parameterName) {
    var result = null,
        tmp = [];
    location.search
        .substr(1)
        .split("&")
        .forEach(function (item) {
          tmp = item.split("=");
          if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
        });
    return result;
}


function initializeLipidData(lipid) {
  lipidKey=getLipidKey(lipid);
  crossRefIndex = findCrossRef(lipidKey);
  for (index in lipidPropertyList) {
    property = lipidPropertyList[index];
    lipid[property]= initLipidProperty(property,lipidKey, storeInLocalStorage[property], crossRefIndex);
  }
  if (lipid['mixPropertyLocked']==undefined) {
	lipid['mixPropertyLocked']='molarRatioInMix';
  }
  // Ensure initial data
  // if concentration is set
  if (lipid.MW!=0) {
    if (lipid.stockConcentration_g_l!=undefined) {
        lipid.stockConcentration_m_l =  lipid.stockConcentration_g_l / lipid.MW * 1e3;
    }
  }
}

function addLipidToMix(lipidSrc,lipidId) {
    lipidKey=lipidSrc+'-'+lipidId;
    lipid = {};
    lipid.src=lipidSrc;
    lipid.id=lipidId;
	// Check for duplicates -> avoids bug in renaming
	var data = $("#lipidmix-table").tabulator("getData");
	for (index in data) {
		lipidTested = data[index];
		if (lipidKey==getLipidKey(lipidTested)) {
			alert("Lipid already in mix");
			return;
		}
	}
    // Initializes data
    initializeLipidData(lipid);
    // Adds it to the table
    addToTableMix(lipid);
}
