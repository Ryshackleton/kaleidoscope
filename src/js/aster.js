import * as d3 from 'd3';
import mergeSort from './merge-sort.js';
import d3tip from './d3-tip-d3-v4.js';

/**
 * reusable D3 aster plot
 * Initially inspired by: http://bl.ocks.org/bbest/2de0e25d4840c68f2db1
 *  with updates to be d3 v4 compatible
 * requires merge-sort, D3 version 4, and D3 tip
 * https://github.com/justinforce/merge-sort
 * https://d3js.org/
 * https://github.com/VACLab/d3-tip
 * Created by ryshackleton on 5/16/17.
 */
export default function d3aster(options) {
    /* Default user-settable options. Pass to constructor to modify, or use methods below to change
        - accessible via aster.defaultOptions() method
     */
    var defaultOptions =
        {
            // static options
            margin: { top: 10, left: 10, right: 10, bottom: 10 },
            width: 500,
            height: 500,
            innerRadius: 0, // defines the radius of empty space in the center of the plot
            heightDomain: null, // user settable height domain [min, max]
            
            /* if true, shows an outline of the pie slices and the outer arc
             * css selector: .outlineArc */
            showOuterArc: false,
    
            /* if true, adds a label to the center of the plot,
             labels can be modified using centerLabelTextFunc
             css selector: .center-label-text */
            showCenterLabel: false,
            
            /* if true, adds labels along the arc of the aster plot,
                labels can be modified using arcLabelsTextFunc and arcLabelsTextFillFunc
                 css selector: .arc-labels-text */
            showWidthLabels: false,
            
            /* if true, adds radial labels, usually representing the height variable
             labels can be modified using heightLabelsTextFunc and heightLabelsTextFillFunc
             css selector: .height-data-labels-text */
            showHeightLabels: false,
            
            /* transition methods: "changeLengthSlice", "narrowSlice" "sweepSlice", "twistSlice" */
            transitionMethod: "changeLengthSlice",
            /* changes animation speed and delay */
            transitionDuration: 50,
            transitionDelay: 200,
            /* adjusts font size of labels as a percentage of the page width
                (usually needs to be smaller for more data & thinner bar widths */
            labelFontSizePercentageOfWidth: 0.25,
            
            /* functions for modifying display of aster plot (labels, tooltips, etc)
            --> set these functions using my.radiusFunc(functionYouHaveDefined); <--
            */
            radiusFunc: function(){
                return Math.min(this.width - this.margin.left - this.margin.right,
                                this.height - this.margin.top - this.margin.bottom) / 2;
            },
            
            /* Return any text string for the center labels: HTML not allowed here */
            centerLabelText: "",
            
            /* Return any text string: HTML not allowed here */
            arcLabelsTextFunc: function(d){ return d.data.label_arc_short; },
            
            /* function to modify label fill - this one brightens arc labels using d3.color.brighter */
            arcLabelsTextFillFunc: function(d) {
                var sliceData = d.data; // access to data for each slice
                return d3.color(sliceData.color).brighter(0.6).toString();
            },
            
            /* function to modify data labels - this one trims to 0 decimal places and adds the label_height_unit
               variable to the string if it exists */
            heightLabelsFunc: function(d) {
                var sliceData = d.data; // access to data for each slice
                var str = (+sliceData.height_var).toFixed(0); // trim off decimals
                if( sliceData.label_height_unit !== undefined ) // if there is a unit label, append it
                    str += sliceData.label_height_unit;
                return  str;
            },
            
            /* function to modify data label fill - this one darkens arc labels using d3.color.darker */
            heightLabelsFillFunc: function(d) {
                var sliceData = d.data; // access to data for each slice
                return d3.color(sliceData.color).darker(0.9).toString();
            },
            
            /* function to modify tooltip HTML - this one just prints out the data on 2 lines */
            toolTipHTMLFunc: function(d)
            {
                var sliceData = d.data;
                return "<span style='color:"+sliceData.color+"'>"
                    +sliceData.label_arc_short + "</span>: "
                    +sliceData.label_arc_long +"</br>"
                    + sliceData.label_legend;
            },
            
            /*  comparison function to sort pie slices, sort is done manually using https://github.com/justinforce/merge-sort
                to prevent problems with browser unstable default sorting:
                (http://stackoverflow.com/questions/3026281/array-sort-sorting-stability-in-different-browsers)

                sort ascending by height example:
                    function(a, b) { return +a.height_var < +b.height_var; }
                    
                sort descending by width example:
                function(a, b) { return +a.width_var > +b.width_var; }
            */
            pieSortFunc: null
            
            
        };
    
    var self = this;
    
    // merge default and input options (overwriting defaults where applicable)
    self.options = Object.assign({}, defaultOptions, options);
    // d3 constructs
    var heightScale = d3.scaleLinear(),
        pie = d3.pie()
                .value(function(d)
                {
                    return d.width_var;
                })
                .sort(null),
        arc = d3.arc(),
        tip = d3tip()
                .attr('class', 'd3-tip')
                .offset([0, 0])
                .html(self.options.toolTipHTMLFunc),
        outlineArc = d3.arc()
    ;
    
    /* main PUBLIC render method to expose API
     * this is the main method called upon update, and requires a selection:
     * useage example:
     * var myAster = new d3.aster();
     * d3.json("http://myserver.com",function(err,data){
     *      d3.select("body")
     *          .selectAll("#myAsterDivID")
     *          .datum(data)
     *          .call(myAster);
     */
    function my(selection) {
        
        var tweenFunc = getTweenFunction();
    
        selection.each(function(selectionData) {
            // clone the data
            var data = JSON.parse(JSON.stringify(selectionData));
            
            // check for data.width_var variable, if it doesn't exist, make slices even widths
            var sliceWidth = 1 / data.length; // constant slice width
            var id = 0;
            data.forEach(function(d) {
                if( d.width_var === undefined )
                {
                    d.width_var = sliceWidth;
                }
                d.slice_id = id++;
            });
            
            // manually sort data (don't use default array.sort, which can use unstable sort)
            if( self.options.pieSortFunc !== null  )
            {
                data = data.mergeSort(self.options.pieSortFunc);
            }
    
            updateHeightScale(data);
            
            updateArcs();
            
            // Select the svg element, if it exists.
            var svg = d3.select(this).selectAll("svg").data([data]);
            fadeOutLabels(svg);

            // Otherwise, create the skeletal chart.
            var gEnter = svg.enter().append("svg");
            gEnter.append("g").attr("class", "outer-arcs-group");
            gEnter.append("g").attr("class", "pie-arcs-group");
            gEnter.append("g").attr("class", "pie-arcs-labels");
            gEnter.append("g").attr("class", "pie-center-label").append("svg:text")
                .attr("class", "center-label-text").attr("dy", ".35em").attr("text-anchor", "middle");
            
            // re-select the svg (upon creation, svg will not have been appended)
            svg = d3.select(this).selectAll("svg")
                    .attr("width",self.options.width)
                    .attr("height",self.options.height)
                    .call(tip);
    
            // if we're "sweeping" in, delete all and start over
            if( self.options.transitionMethod === "sweepSlice" )
            {
                svg.select(".pie-arcs-group").selectAll(".solidArc").remove();
            }
            
            var pieData = pie(data);
            var g = svg.select(".pie-arcs-group")
                .attr("transform", "translate(" + self.options.width / 2 + "," + self.options.height / 2 + ")");
            
            // created the visible arcs
            var pathUpdate = g.selectAll(".solidArc")
                .data(pieData);

            var path = pathUpdate
                .enter()
                .append("path")
                .attr("class", "solidArc")
                .style("stroke", "gray")
                .on('mouseover', tip.show)
                .on('mouseout', tip.hide)
                .merge(pathUpdate); // MERGE enter & update

            var prevEndAngle = 0; // copy the previous end angle to the next slice (for sweep transition effect)
            path.each(function(d) {
                d.prevEndAngle = prevEndAngle;
                prevEndAngle = d.endAngle;
            });

            // update everything else
            path
                .attr("fill", function(d)
                {
                    return d.data.color;
                })
                .transition()
                .ease(d3.easeLinear)
                .delay(getDelayFunction())
                .duration(getDurationForTween())
                .attrTween("d", tweenFunc)
            ;

            pathUpdate.exit().remove();

            updateCenterLabelText(svg);
            updateArcLabels(pieData,svg);
            updateValueLabels(pieData,svg);
            updateOuterArc(pieData,svg);
        });

    }
    
    /* ---- PRIVATE METHODS ------ */
    function updateOuterArc(pieData,svg)
    {
        if( self.options.showOuterArc )
        {
            var outerUpdate = svg.selectAll(".outer-arcs-group")
                .attr("transform", "translate(" + self.options.width / 2 + "," + self.options.height / 2 + ")")
                .selectAll(".outlineArc")
                .data(pieData/*,function(d){ return d.data.slice_id; }*/);
            
            var outer = outerUpdate
                .enter().append("path")
                .attr("fill", "none")
                .attr("stroke", "gray")
                .attr("class", "outlineArc")
                .merge(outerUpdate);
            
            outer
                .transition()
                .ease(d3.easeLinear)
                .delay(self.options.transitionDelay)
                .duration(self.options.transitionDuration * 3)
                .attr("d", outlineArc);
        }
        else
        {
            svg.selectAll(".outlineArc").remove();
        }
    }
    
    function fadeMeOut(node)
    {
        node.transition()
            .delay(0)
            .duration(getDurationForTween() * 0.1)
            .style("opacity",0);
    }
    
    function fadeMeIn(node,data)
    {
        node.transition()
            .delay(function(){
                if( self.options.transitionMethod === "sweepSlice" )
                    return self.options.transitionDelay * (1+data.length);
                return self.options.transitionDelay * 2;
            })
            .duration(getDurationForTween())
            .style("opacity",1);
    }
    
    function fadeOutLabels(svg)
    {
        fadeMeOut(svg.select(".pie-arcs-labels"));
    }
    
    function fadeInLabels(pieData,svg)
    {
        fadeMeIn(svg.select(".pie-arcs-labels"),pieData);
    }
    
    function updateValueLabels(pieData,svg){
        
        if( !self.options.showHeightLabels )
            return;
    
        var g = svg.select(".pie-arcs-labels")
            .attr("transform", "translate(" + self.options.width / 2 + "," + self.options.height / 2 + ")");
        
        var labelData = pieData.filter(function(d)
        {
            return d.endAngle - d.startAngle > .2;
        });
    
        var insideLabelsUpdate = g.selectAll(".height-data-labels-text")
            .data(labelData, function(d){
                return d.data.slice_id; });
    
        var fontsizePercent = self.options.width * self.options.labelFontSizePercentageOfWidth;
        var insideLabels = insideLabelsUpdate
            .enter()
            .append("text")
            .attr("class", "height-data-labels-text")
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")
            .style("fill",self.options.heightLabelsFillFunc)
            .style("font-size", fontsizePercent + "%")
            .merge(insideLabelsUpdate);
    
        insideLabels
            .transition()
            .ease(d3.easeLinear)
            .delay(getDelayFunction())
            .duration(getDurationForTween())
            .attr("transform", function(d) { //set the label's origin to the center of the arc
                //we have to make sure to set these before calling arc.centroid
                d.outerRadius = self.options.radiusFunc(); // Set Outer Coordinate
                d.innerRadius = self.options.innerRadius; // Set Inner Coordinate
                return "translate(" + arc.centroid(d) + ")rotate(" + angle(d) + ")";
            })
            .text(function(d){
                var maxPixelLength = d.outerRadius - d.innerRadius;
                return trimTextToLength(self.options.heightLabelsFunc(d),fontsizePercent,maxPixelLength);
            })
            .on("end", fadeInLabels(pieData,svg) );
    
        insideLabelsUpdate.exit().remove();
    
        // Computes the angle of an arc, converting from radians to degrees.
        function angle(d) {
            var a = (d.startAngle + d.endAngle) * 90 / Math.PI - 90;
            return a > 90 ? a - 180 : a;
        }
    }
    
    function updateArcLabels(pieData,svg)
    {
        if( !self.options.showWidthLabels )
            return;
        
        var labelData = pieData.filter(function(d)
        {
            return d.endAngle - d.startAngle > .2;
        });
    
        // create some hidden arcs to attach labels to
        var hiddenPathUpdate = svg.select(".pie-arcs-group")
            .selectAll(".hiddenArc")
            .data(labelData/*, function(d){ return d.data.id; }*/);
    
        var hiddenPath = hiddenPathUpdate
            .enter()
            .insert("path",":first-child")
            .style("opacity", 0)
            .attr("class", "hiddenArc")
            .merge(hiddenPathUpdate); // MERGE enter & update
    
        hiddenPath
            .attr("id", function(d) { return "labelArc_"+d.data.slice_id; }) //Give each slice a unique ID
            .transition()
            .ease(d3.easeLinear)
            .delay(getDelayFunction())
            .duration(getDurationForTween())
            .attr("d", arc)
            .on("end", fadeInLabels(pieData,svg) )
        ;
        
        hiddenPathUpdate.exit().remove();
        
        var arcLabelsUpdate = svg.select(".pie-arcs-labels")
            .attr("transform", "translate(" + self.options.width / 2 + "," + self.options.height / 2 + ")")
            .selectAll(".arc-labels-text")
            .data(labelData, function(d){ return d.data.slice_id; });
        
        var fontsizePercent = self.options.width * self.options.labelFontSizePercentageOfWidth;
        var arcLabels = arcLabelsUpdate
                .enter()
                .append("text")
                .attr("class", "arc-labels-text")
                .attr("id",function(d){ return d.data.slice_id; })
                .style("fill-opacity",1)
                .style("fill",self.options.arcLabelsTextFillFunc)
                .style("font-size", fontsizePercent + "%")
                //Move the text from the start angle of the arc
                .attr("x", function(d){
                    return 0.05 * self.options.radiusFunc() * (d.endAngle - d.startAngle); } )
                .attr("dy", function(d) { return Math.round((self.options.radiusFunc() - self.options.innerRadius )*0.1) })
            .merge(arcLabelsUpdate)
                .each(function(d) {
                    d.arcLength = heightScale(d.data.height_var) * (d.endAngle - d.startAngle);
                });
    
        
        arcLabels
            .each(function(d) {
                var arcLabel = d3.select(this);
                var textPath = arcLabel.select("textPath");
                if( textPath.nodes().length < 1 ){
                    textPath = arcLabel.append("textPath");
                }
                
                // call the label text function, but trim to ensure that the values don't extend past the end of the arc
                var labelTextTrimmed = trimTextToLength(self.options.arcLabelsTextFunc(d),fontsizePercent,d.arcLength);
                var myLabelArc = arcLabels.select("#labelArc_"+d.data.slice_id);
                textPath
                    .attr("xlink:href", "#labelArc_" + d.data.slice_id )
                    .text(labelTextTrimmed);
                ;
            })
        ;
        
        arcLabels.exit().remove();
    }
    
    function updateCenterLabelText(svg) {
    
        if( !self.options.showCenterLabel )
            return;
        
        var g = svg.select(".pie-center-label")
            .attr("transform", "translate(" + self.options.width / 2 + "," + self.options.height / 2 + ")");
        
        var labelText = trimTextToLength(self.options.centerLabelText,self.options.labelFontSizePercentageOfWidth,
                                            self.options.innerRadius);
        g.select(".center-label-text")
            .text(labelText);
    }
   
    /* measure the length of a string in pixels:
     * http://stackoverflow.com/questions/16478836/measuring-length-of-string-in-pixel-in-javascript
     */
    function stringLengthPixels(str,fontsizePercent) {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext("2d");
        ctx.font = fontsizePercent+"% Arial";
        return ctx.measureText(str).width;
    }
    
    /* determine the length of the string and truncate if the text is longer than the specified max size */
    function trimTextToLength(labelText,fontsizePercent,maxLengthPixels){
        var charWidth = stringLengthPixels("e",fontsizePercent);
        var pixelSizeOfOneLetter = charWidth < 0.1 ? 1 : charWidth;
        var maxNChars = Math.floor(maxLengthPixels / pixelSizeOfOneLetter);
        var returnText = labelText;
        if( returnText.length > maxNChars ) {
            // trim string to the appropriate length
            returnText = returnText.substr(0,maxNChars);
            // replace the last 3 letters with ... to indicate truncation
            // https://regex101.com/r/DmWg40/1
            returnText = returnText.replace( /...$/g , "...");
        }
        return returnText;
    }
    
    function updateArcs()
    {
        arc.innerRadius(self.options.innerRadius)
            .outerRadius(function(d)
            {
                d.innerRadius = self.options.innerRadius;
                d.outerRadius = heightScale(+d.data.height_var) + self.options.innerRadius;
                return d.outerRadius;
            });
        
        outlineArc.innerRadius(self.options.innerRadius)
                    .outerRadius(self.options.radiusFunc())
    }
    
    function updateHeightScale(data) {
        // get data range and update the height scale and arc generators appropriately
        if( self.options.heightDomain === null )
        {
            var hmin = d3.min(data, function(d)
            {
                return +d.height_var;
            });
            var hmax = d3.max(data, function(d)
            {
                return +d.height_var;
            });
            heightScale.domain([hmin, hmax])
        }
        else
            heightScale.domain(self.options.heightDomain);
        
        heightScale
            .range([self.options.radiusFunc() * 0.2, self.options.radiusFunc() - self.options.innerRadius]);
    }
    
    function getDelayFunction() {
        switch (self.options.transitionMethod) {
            case 'sweepSlice':
                return function(d,i){
                    return (i + 1) * self.options.transitionDelay;
                };
                break;
            default:
                return self.options.transitionDelay;
        }
    }
    
    function getDurationForTween() {
        switch (self.options.transitionMethod) {
            case 'sweepSlice':
                return function(d,i){
                    return self.options.transitionDuration;
                };
                break;
            default:
                return self.options.transitionDuration * 3;
        }
    }
    
    function getTweenFunction() {
    
        // transition methods: "changeLengthSlice", "narrowSlice" "sweepSlice", "twistSlice"
        switch (self.options.transitionMethod) {
            case 'changeLengthSlice':
                return tweenChangeLength;
                break;
            case 'sweepSlice':
                return tweenSweep;
                break;
            case 'twistSlice':
                return tweenTwist;
                break;
            case 'narrowSlice':
                return tweenNarrow;
                break;
            default:
                return tweenChangeLength;
        }
    
        // tweening functions
        function tweenChangeLength(b)
        {
            // standard, just transition to the appropriate radiusFunc
            var i = d3.interpolate({innerRadius: 0}, b);
            return function(t)
            {
                return arc(i(t));
            };
        }
        function tweenSweep(b)
        {
            var i = d3.interpolate({startAngle: b.prevEndAngle, endAngle: b.prevEndAngle }, b);
            return function(t)
            {
                return arc(i(t));
            };
        }
        function tweenNarrow(b)
        {
            // narrow slices slightly while transition is occurring
            var i = d3.interpolate({innerRadius: 0, padAngle: (b.endAngle - b.startAngle) * 0.25 }, b);
        
            return function(t)
            {
                return arc(i(t));
            };
        }
        function tweenTwist(b)
        {
            // twist slices
            var i = d3.interpolate(
                {
                    innerRadius: 0, startAngle: b.prevEndAngle + Math.PI, endAngle: b.prevEndAngle
                }, b);
            return function(t)
            {
                return arc(i(t));
            };
        }
    }
    
    /* ---- PUBLIC METHODS ------ */
    //  getter/setters
    my.defaultOptions = function() {
        return defaultOptions;
    };
    
    my.margin = function(d) {
        if( arguments.length === 0 )
            return self.options.margin;
        self.options.margin = Object.assign({},defaultOptions.margin,d);
        return my;
    };
    
    my.width = function(d) {
        if( arguments.length === 0 )
            return self.options.width;
        self.options.width = d;
        return my;
    };
    
    my.height = function(d) {
        if( arguments.length === 0 )
            return self.options.height;
        self.options.height = d;
        return my;
    };
    
    my.fitContainer = function(containerSelector)
    {
        if(d3.select(containerSelector).nodes().length === 0)
            return my;
        
        var rect = d3.select(containerSelector).node().getBoundingClientRect();
        self.options.width = rect.width;
        self.options.height = rect.height;
        
        return my;
    };
    
    my.innerRadius = function(d) {
        if( arguments.length === 0 )
            return self.options.innerRadius;
        self.options.innerRadius = d;
        return my;
    };
    
    my.heightDomain = function(d) {
        if( arguments.length === 0 )
            return self.options.heightDomain;
        if( d.constructor === Array && d.length === 2 )
            self.options.heightDomain = d;
        else
            throw new TypeError("Argument 'heightDomain' must be an array of size 2");
        return my;
    };
    
    my.transitionMethod = function(d) {
        if( arguments.length === 0 )
            return self.options.transitionMethod;
        self.options.transitionMethod = d;
        return my;
    };
    
    my.transitionMethodsArray = function() {
        return [ "changeLengthSlice", "narrowSlice", "sweepSlice", "twistSlice" ];
    };
    
    my.setRandomTransition = function(exclude) {
        var arr = [ "changeLengthSlice", "narrowSlice", "sweepSlice", "twistSlice" ];
        var index = arr.indexOf(exclude);
        if (index > -1) {
            arr.splice(index, 1);
}
        var randomInt = Math.floor(Math.random() * (arr.length));
        self.options.transitionMethod = arr[randomInt];
    };
    
    my.showOuterArc = function(d) {
        if( arguments.length === 0 )
            return self.options.showOuterArc;
        self.options.showOuterArc = d;
        return my;
    };
    
    my.showCenterLabel = function(d) {
        if( arguments.length === 0 )
            return self.options.showCenterLabel;
        self.options.showCenterLabel = d;
        return my;
    };
    
    my.showWidthLabels = function(d) {
        if( arguments.length === 0 )
            return self.options.showWidthLabels;
        self.options.showWidthLabels = d;
        return my;
    };
    
    my.showHeightLabels = function(d) {
        if( arguments.length === 0 )
            return self.options.showHeightLabels;
        self.options.showHeightLabels = d;
        return my;
    };
    
    my.tip = function(d) {
        if( arguments.length === 0 )
            return tip;
        tip = d;
        return my;
    };
    
    my.transitionDuration = function(d) {
        if( arguments.length === 0 )
            return self.options.transitionDuration;
        self.options.transitionDuration = d;
        return my;
    };
    
    my.transitionDelay = function(d) {
        if( arguments.length === 0 )
            return self.options.transitionDelay;
        self.options.transitionDelay = d;
        return my;
    };
    
    my.labelFontSizePercentageOfWidth = function(d) {
        if( arguments.length === 0 )
            return self.options.labelFontSizePercentageOfWidth;
        self.options.labelFontSizePercentageOfWidth = d;
        return my;
    };
    
    // functions
    my.radiusFunc = function(d) {
        if( arguments.length === 0 )
            return self.options.radiusFunc;
        if( typeof d !== "function" )
            throw new Error("Argument 'radiusFunc' must be a function");
        self.options.radiusFunc = d;
        return my;
    };
    
    my.centerLabelText = function(d) {
        if( arguments.length === 0 )
            return self.options.centerLabelText;
        self.options.centerLabelText = d;
        return my;
    };
    
    my.arcLabelsTextFunc = function(d) {
        if( arguments.length === 0 )
            return self.options.arcLabelsTextFunc;
        if( typeof d !== "function" )
            throw new Error("Argument 'arcLabelsTextFunc' must be a function");
        self.options.arcLabelsTextFunc = d;
        return my;
    };
    my.arcLabelsTextFillFunc = function(d) {
        if( arguments.length === 0 )
            return self.options.arcLabelsTextFillFunc;
        if( typeof d !== "function" )
            throw new Error("Argument 'arcLabelsTextFillFunc' must be a function");
        self.options.arcLabelsTextFillFunc = d;
        return my;
    };
    
    my.heightLabelsFunc = function(d) {
        if( arguments.length === 0 )
            return self.options.heightLabelsFunc;
        if( typeof d !== "function" )
            throw new Error("Argument 'heightLabelsFunc' must be a function");
        self.options.heightLabelsFunc = d;
        return my;
    };
    
    my.heightLabelsFillFunc = function(d) {
        if( arguments.length === 0 )
            return self.options.heightLabelsFillFunc;
        if( typeof d !== "function" )
            throw new Error("Argument 'heightLabelsFillFunc' must be a function");
        self.options.heightLabelsFillFunc = d;
        return my;
    };
    
    my.toolTipHTMLFunc = function(d) {
    
        if( arguments.length === 0 )
            return self.options.toolTipHTMLFunc;
        if( typeof d !== "function" )
            throw new Error("Argument 'toolTipHTMLFunc' must be a function");
        self.options.toolTipHTMLFunc = d;
        tip.html(self.options.toolTipHTMLFunc);
        return my;
    };
    
    my.pieSortFunc = function(d) {
        if( arguments.length === 0 )
            return self.options.pieSortFunc;
        if( d !== null && typeof d !== "function" )
            throw new Error("Argument 'pieSortFunc' must be a function");
        self.options.pieSortFunc = d;
        return my;
    };
    
    return my;
    
}


