/**
 * Created by ryshackleton on 5/15/17.
 * Modified from: http://bl.ocks.org/bbest/2de0e25d4840c68f2db1
 *  with updates to be d3 v4 compatible
 */

var aster = new d3.aster({width: 500, height: 500, showOuterArc: false, transitionMethod: "sweepSlice"});
aster.innerRadius(10);
var lastSelectedData = null;

var body = d3.select("body");

body.append("h1")
    .text("Kaleidoscope Cannabis Logo/Terpene Pie Mockup");

body.append("h2")
    .text("Mouseover the name of a brand to see the terpene content");

body.append("button")
    .text("Sort By Increasing Terpenes")
    .on('click', function() {
        if( d3.select(this).node().innerHTML === "Sort By Increasing Terpenes" ){
            // example of how to set a sort function example, sort by height ascending
            aster.pieSortFunc(function(a, b)
            {
                return +a.height_var > +b.height_var;
            });
            d3.select(this).text("Don't Sort Terpenes");
        }
        else
        {
            aster.pieSortFunc(null);
            d3.select(this).text("Sort By Increasing Terpenes");
        }
        d3.select("#aster-div")
            .datum(lastSelectedData)
            .call(aster);
    });

body.append("button")
    .text("Label By Feeling")
    .on('click', function() {
        if( d3.select(this).node().innerHTML === "Label by Terpene" )
        {
            aster.arcLabelsTextFunc(function(d){ return d.data.label_arc_short; });
            d3.select(this).text("Label by Feeling");
        }
        else
        {
            aster.arcLabelsTextFunc(function(d){ return d.data.label_legend; });
            d3.select(this).text("Label by Terpene");
        }
        d3.select("#aster-div")
            .datum(lastSelectedData)
            .call(aster);
    });

body.append("div")
    .attr("id","aster-div");

body.append("div")
    .attr("id","brand-labels-div");

// load the logo
d3.csv('dist/data/kaleidoscope_logo_data.csv', function(error, data)
{
    lastSelectedData = data;
    // add a unique id to the data if it doesn't exist
    var id = 0;
    data.forEach(function(d) { if(d.id === undefined) d.id = id++; });
    d3.select("#aster-div")
        .datum(data)
        .call(aster);
});

// set up brand labels and mouseover to trigger their terpene asters
var brandData = {};
d3.csv('dist/data/cannabis_data.csv', function(error, data)
{
    // group the data and add a unique ID to each value
    var id = 0;
    brandData = Object.values(data).reduce(function(grouped,d) {
        if( d.brand !== undefined )
        {
            if( d.id === undefined)
                d.id = "sliceID_"+id++;
            if( grouped[d.brand] === undefined )
                grouped[d.brand] = [];
            grouped[d.brand].push(d);
        }
        return grouped;
    }, {} );

    brandDiv = d3.select("#brand-labels-div");
    Object.keys(brandData).forEach(function(d,i)
    {
        brandDiv
            .append("h3")
            .attr("class","cannabis-labels-text")
            .style("font-weight","normal")
            .attr("id","brand_id_"+i)
            .text(d)
            .on("mouseover", function(){
                d3.selectAll(".cannabis-labels-text")
                    .style("font-weight", "normal");
                
                lastSelectedData = brandData[d];
                
                d3.select("#brand_id_"+i)
                    .style("font-weight","bold");

                aster.showWidthLabels(true);
                aster.showHeightLabels(true);
                aster.setRandomTransition("sweepSlice");
                d3.select("#aster-div")
                    .datum(brandData[d])
                    .call(aster);
            })
            .on("mouseout", function()
            {
                // could un-bold on mouseout...
                // d3.select("#brand_id_" + i)
                //     .style("font-weight", "normal")
            });
    });
});

