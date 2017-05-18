/**
 * Created by ryshackleton on 5/15/17.
 * Modified from: http://bl.ocks.org/bbest/2de0e25d4840c68f2db1
 *  with updates to be d3 v4 compatible
 */

var body = d3.select("body");

body.append("h1")
    .text("Kaleidoscope Cannabis Logo/Terpene Pie Mockup");

body.append("h2")
    .text("Mouseover pie slices to see info (can add labels later)");

body.append("h2")
    .text("Click anywhere in the view to toggle random terpene values and transitions");

var aster = new d3.aster({width: 500, height: 500, showOuterArc: false, transitionMethod: "sweepSlice"});
aster.innerRadius(0);

var theData;
d3.csv('dist/data/kaleidoscope_logo_data.csv', function(error, data)
//  d3.csv('dist/data/example_data_width_var.csv', function(error, data)
{
    theData = data;
    // add a unique id to the data if it doesn't exist
    var id = 0;
    theData.forEach(function(d) { if(d.id === undefined) d.id = id++; });
    renderAster();
});

body.on('click',toggleRandomValues);

function toggleRandomValues()
{
    aster.showWidthLabels(true);
    aster.showHeightLabels(true);
    var transitions = aster.transitionMethodsArray();
    var randomInt = Math.floor(Math.random() * (transitions.length));
    aster.transitionMethod(transitions[randomInt]);
    theData.forEach(function(d)
                    {
                        d.height_var = Math.random() * 100;
                        // d.width_var = Math.random() * 100;
                    });
    renderAster();
}

function renderAster() {
    d3.select("body")
        .datum(theData)
        .call(aster);
}

